import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertMessageSchema, insertGroupSchema, type User, type MessageWithUsers, type GroupWithMembers } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";

const MemStore = MemoryStore(session);

// Extend session data type
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper to sanitize user objects (remove password hash)
  const sanitizeUser = (user: User) => {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  };

  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: new MemStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  };

  // Auth endpoints
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error.errors[0]?.message || "Invalid input" 
        });
      }

      const { username, password } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Create new user
      const user = await storage.createUser({ username, password });

      // Set session
      req.session.userId = user.id;
      
      // Return user without password hash
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to signup" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error.errors[0]?.message || "Invalid input" 
        });
      }

      const { username, password } = result.data;

      // Verify password
      const user = await storage.verifyPassword(username, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Set session
      req.session.userId = user.id;
      
      // Return user without password hash
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Return user without password hash
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // User search
  app.get("/api/users/search", requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      // If no query, return all users (for group member selection)
      if (!query || query.trim().length === 0) {
        const allUsers = await storage.getAllUsers();
        return res.json(allUsers.map(sanitizeUser));
      }

      const users = await storage.searchUsers(query);
      // Return users without password hashes
      res.json(users.map(sanitizeUser));
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Get user by ID
  app.get("/api/users/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Return user without password hash
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Groups
  app.post("/api/groups", requireAuth, async (req, res) => {
    try {
      const result = insertGroupSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error.errors[0]?.message || "Invalid group data" 
        });
      }

      const group = await storage.createGroup(req.session.userId!, result.data);
      const groupWithMembers = await storage.getGroupWithMembers(group.id);
      
      if (!groupWithMembers) {
        return res.status(500).json({ error: "Failed to get group data" });
      }

      // Sanitize user objects in members
      const sanitizedGroup = {
        ...groupWithMembers,
        members: groupWithMembers.members.map(sanitizeUser)
      };

      res.json(sanitizedGroup);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.get("/api/groups", requireAuth, async (req, res) => {
    try {
      const groups = await storage.getGroupsForUser(req.session.userId!);
      // Sanitize user objects in groups
      const sanitizedGroups = groups.map(group => ({
        ...group,
        members: group.members.map(sanitizeUser)
      }));
      res.json(sanitizedGroups);
    } catch (error) {
      console.error("Get groups error:", error);
      res.status(500).json({ error: "Failed to get groups" });
    }
  });

  app.get("/api/groups/:groupId", requireAuth, async (req, res) => {
    try {
      const { groupId } = req.params;
      const group = await storage.getGroupWithMembers(groupId);
      
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Verify user is a member
      const isMember = group.members.some(m => m.id === req.session.userId);
      if (!isMember) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      // Sanitize user objects
      const sanitizedGroup = {
        ...group,
        members: group.members.map(sanitizeUser)
      };

      res.json(sanitizedGroup);
    } catch (error) {
      console.error("Get group error:", error);
      res.status(500).json({ error: "Failed to get group" });
    }
  });

  // Conversations
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversationsForUser(req.session.userId!);
      // Sanitize user objects in conversations
      const sanitizedConversations = conversations.map(conv => {
        if (conv.type === "direct" && conv.otherUser) {
          return {
            ...conv,
            otherUser: sanitizeUser(conv.otherUser)
          };
        } else if (conv.type === "group" && conv.group) {
          return {
            ...conv,
            group: {
              ...conv.group,
              members: conv.group.members.map(sanitizeUser)
            }
          };
        }
        return conv;
      });
      res.json(sanitizedConversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Messages
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const groupId = req.query.groupId as string;
      
      if (!userId && !groupId) {
        return res.status(400).json({ error: "userId or groupId query parameter is required" });
      }

      let messages: MessageWithUsers[] = [];

      if (groupId) {
        // Get group messages
        const group = await storage.getGroupWithMembers(groupId);
        if (!group) {
          return res.status(404).json({ error: "Group not found" });
        }

        // Verify user is a member
        const isMember = group.members.some(m => m.id === req.session.userId);
        if (!isMember) {
          return res.status(403).json({ error: "Not a member of this group" });
        }

        messages = await storage.getGroupMessages(groupId);
      } else {
        // Get direct messages
        messages = await storage.getMessagesBetweenUsers(req.session.userId!, userId);
      }

      // Sanitize user objects in messages
      const sanitizedMessages = messages.map(msg => ({
        ...msg,
        sender: sanitizeUser(msg.sender),
        recipient: msg.recipient ? sanitizeUser(msg.recipient) : undefined,
        group: msg.group ? {
          ...msg.group,
          members: msg.group.members.map(sanitizeUser)
        } : undefined
      }));
      res.json(sanitizedMessages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const result = insertMessageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error.errors[0]?.message || "Invalid message data" 
        });
      }

      const message = await storage.createMessage(req.session.userId!, result.data);
      
      // Get full message with user and/or group objects
      const sender = await storage.getUser(message.senderId);
      if (!sender) {
        return res.status(500).json({ error: "Failed to get sender data" });
      }

      let messageWithUsers: any = {
        ...message,
        sender: sanitizeUser(sender),
      };

      if (message.recipientId) {
        // Direct message
        const recipient = await storage.getUser(message.recipientId);
        if (!recipient) {
          return res.status(500).json({ error: "Failed to get recipient data" });
        }
        messageWithUsers.recipient = sanitizeUser(recipient);
      } else if (message.groupId) {
        // Group message
        const group = await storage.getGroupWithMembers(message.groupId);
        if (!group) {
          return res.status(500).json({ error: "Failed to get group data" });
        }
        messageWithUsers.group = {
          ...group,
          members: group.members.map(sanitizeUser)
        };
      }

      // Broadcast to all connected WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(messageWithUsers));
        }
      });

      res.json(messageWithUsers);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}

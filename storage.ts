import { type User, type InsertUser, type Message, type InsertMessage, type Conversation, type MessageWithUsers, type Group, type InsertGroup, type GroupWithMembers } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(username: string, password: string): Promise<User | null>;
  
  // Group operations
  createGroup(createdBy: string, group: InsertGroup): Promise<Group>;
  getGroup(id: string): Promise<Group | undefined>;
  getGroupWithMembers(id: string): Promise<GroupWithMembers | undefined>;
  getGroupsForUser(userId: string): Promise<GroupWithMembers[]>;
  addGroupMember(groupId: string, userId: string): Promise<void>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<User[]>;
  
  // Message operations
  createMessage(senderId: string, message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(userId1: string, userId2: string): Promise<MessageWithUsers[]>;
  getGroupMessages(groupId: string): Promise<MessageWithUsers[]>;
  
  // Conversation operations
  getConversationsForUser(userId: string): Promise<Conversation[]>;
  
  // User search
  searchUsers(query: string): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private messages: Map<string, Message>;
  private groups: Map<string, Group>;
  private groupMembers: Map<string, Set<string>>; // groupId -> Set of userIds

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(insertUser.password, 10);
    const user: User = { 
      id, 
      username: insertUser.username, 
      passwordHash 
    };
    this.users.set(id, user);
    return user;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async createGroup(createdBy: string, insertGroup: InsertGroup): Promise<Group> {
    const id = randomUUID();
    const group: Group = {
      id,
      name: insertGroup.name,
      createdBy,
      createdAt: new Date(),
    };
    this.groups.set(id, group);
    
    // Add creator and initial members
    const members = new Set<string>([createdBy, ...insertGroup.memberIds]);
    this.groupMembers.set(id, members);
    
    return group;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupWithMembers(id: string): Promise<GroupWithMembers | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;

    const members = await this.getGroupMembers(id);
    return {
      ...group,
      members,
      memberCount: members.length,
    };
  }

  async getGroupsForUser(userId: string): Promise<GroupWithMembers[]> {
    const userGroups: GroupWithMembers[] = [];

    for (const [groupId, memberIds] of this.groupMembers.entries()) {
      if (memberIds.has(userId)) {
        const groupWithMembers = await this.getGroupWithMembers(groupId);
        if (groupWithMembers) {
          userGroups.push(groupWithMembers);
        }
      }
    }

    return userGroups;
  }

  async addGroupMember(groupId: string, userId: string): Promise<void> {
    const members = this.groupMembers.get(groupId);
    if (members) {
      members.add(userId);
    }
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    const members = this.groupMembers.get(groupId);
    if (members) {
      members.delete(userId);
    }
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    const memberIds = this.groupMembers.get(groupId);
    if (!memberIds) return [];

    const members: User[] = [];
    for (const userId of memberIds) {
      const user = await this.getUser(userId);
      if (user) {
        members.push(user);
      }
    }
    return members;
  }

  async createMessage(senderId: string, insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      id,
      senderId,
      recipientId: insertMessage.recipientId || null,
      groupId: insertMessage.groupId || null,
      content: insertMessage.content,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getGroupMessages(groupId: string): Promise<MessageWithUsers[]> {
    const allMessages = Array.from(this.messages.values());
    const groupMessages = allMessages.filter(msg => msg.groupId === groupId);

    // Sort by creation time
    groupMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Attach user and group objects
    const messagesWithUsers: MessageWithUsers[] = [];
    const group = await this.getGroupWithMembers(groupId);

    for (const msg of groupMessages) {
      const sender = await this.getUser(msg.senderId);
      if (sender && group) {
        messagesWithUsers.push({
          ...msg,
          sender,
          group,
        });
      }
    }

    return messagesWithUsers;
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<MessageWithUsers[]> {
    const allMessages = Array.from(this.messages.values());
    const relevantMessages = allMessages.filter(
      (msg) =>
        (msg.senderId === userId1 && msg.recipientId === userId2) ||
        (msg.senderId === userId2 && msg.recipientId === userId1)
    );

    // Sort by creation time
    relevantMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Attach user objects
    const messagesWithUsers: MessageWithUsers[] = [];
    for (const msg of relevantMessages) {
      const sender = await this.getUser(msg.senderId);
      const recipient = await this.getUser(msg.recipientId);
      if (sender && recipient) {
        messagesWithUsers.push({
          ...msg,
          sender,
          recipient,
        });
      }
    }

    return messagesWithUsers;
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    const allMessages = Array.from(this.messages.values());
    const conversations: Conversation[] = [];
    
    // Direct message conversations
    const otherUserIds = new Set<string>();
    allMessages.forEach((msg) => {
      if (!msg.groupId) { // Only direct messages
        if (msg.senderId === userId && msg.recipientId) {
          otherUserIds.add(msg.recipientId);
        } else if (msg.recipientId === userId) {
          otherUserIds.add(msg.senderId);
        }
      }
    });

    for (const otherUserId of otherUserIds) {
      const otherUser = await this.getUser(otherUserId);
      if (!otherUser) continue;

      // Get messages between these users
      const messages = allMessages.filter(
        (msg) =>
          !msg.groupId && (
            (msg.senderId === userId && msg.recipientId === otherUserId) ||
            (msg.senderId === otherUserId && msg.recipientId === userId)
          )
      );

      // Sort by creation time to get the latest message
      messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const lastMessage = messages[0] || null;

      conversations.push({
        type: "direct",
        otherUser,
        lastMessage,
        unreadCount: 0,
      });
    }

    // Group conversations
    const userGroups = await this.getGroupsForUser(userId);
    for (const group of userGroups) {
      // Get last message in this group
      const groupMessages = allMessages.filter(msg => msg.groupId === group.id);
      groupMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const lastMessage = groupMessages[0] || null;

      conversations.push({
        type: "group",
        group,
        lastMessage,
        unreadCount: 0,
      });
    }

    // Sort all conversations by last message time
    conversations.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt.getTime() || 0;
      const timeB = b.lastMessage?.createdAt.getTime() || 0;
      return timeB - timeA;
    });

    return conversations;
  }

  async searchUsers(query: string): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.users.values()).filter((user) =>
      user.username.toLowerCase().includes(lowerQuery)
    );
  }
}

export const storage = new MemStorage();

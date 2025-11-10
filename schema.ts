import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - name and password login
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

// Groups table
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Group members table
export const groupMembers = pgTable("group_members", {
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
});

// Messages table - supports both direct and group messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").references(() => users.id),
  groupId: varchar("group_id").references(() => groups.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
}).extend({
  memberIds: z.array(z.string()).min(1, "At least one member is required"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  recipientId: true,
  groupId: true,
  content: true,
}).refine(
  (data) => (data.recipientId && !data.groupId) || (!data.recipientId && data.groupId),
  { message: "Message must have either recipientId or groupId, not both" }
);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Extended types for frontend
export type GroupWithMembers = Group & {
  members: User[];
  memberCount: number;
};

export type MessageWithUsers = Message & {
  sender: User;
  recipient?: User;
  group?: GroupWithMembers;
};

export type Conversation = {
  type: "direct" | "group";
  otherUser?: User;
  group?: GroupWithMembers;
  lastMessage: Message | null;
  unreadCount: number;
};

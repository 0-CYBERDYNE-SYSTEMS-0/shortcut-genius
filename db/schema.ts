import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const shortcuts = pgTable("shortcuts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  content: jsonb("content").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
});

export const apiUsage = pgTable("api_usage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").references(() => users.id),
  model: text("model").notNull(),
  tokens_used: integer("tokens_used").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertShortcutSchema = createInsertSchema(shortcuts);
export const selectShortcutSchema = createSelectSchema(shortcuts);
export type InsertShortcut = z.infer<typeof insertShortcutSchema>;
export type Shortcut = z.infer<typeof selectShortcutSchema>;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const insertApiUsageSchema = createInsertSchema(apiUsage);
export const selectApiUsageSchema = createSelectSchema(apiUsage);
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
export type ApiUsage = z.infer<typeof selectApiUsageSchema>;

// Conversation tables for chat functionality
export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const shortcutVersions = pgTable("shortcut_versions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  version: integer("version").notNull(),
  shortcutData: jsonb("shortcut_data").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }).notNull(),
  preferredModel: text("preferred_model").default('gpt-4o'),
  preferredComplexity: text("preferred_complexity").default('auto'), // 'simple' | 'medium' | 'complex' | 'auto'
  metadata: jsonb("metadata").default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for new tables
export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = z.infer<typeof selectConversationSchema>;

export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = z.infer<typeof selectMessageSchema>;

export const insertShortcutVersionSchema = createInsertSchema(shortcutVersions);
export const selectShortcutVersionSchema = createSelectSchema(shortcutVersions);
export type InsertShortcutVersion = z.infer<typeof insertShortcutVersionSchema>;
export type ShortcutVersion = z.infer<typeof selectShortcutVersionSchema>;

export const insertUserPreferencesSchema = createInsertSchema(userPreferences);
export const selectUserPreferencesSchema = createSelectSchema(userPreferences);
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = z.infer<typeof selectUserPreferencesSchema>;

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

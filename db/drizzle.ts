import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "DATABASE_URL is not set. Database operations will fail until configured.",
  );
}

const sql = databaseUrl ? neon(databaseUrl) : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is required for database operations.");
  }
  return db;
}

import dotenv from "dotenv";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add a valid Postgres/Neon connection string to .env."
  );
}

if (
  connectionString.includes("username:password") ||
  connectionString.includes("user:pass")
) {
  throw new Error(
    "DATABASE_URL is still a placeholder. Replace it with a real connection string in .env."
  );
}

const preferNodePg = process.env.DB_DRIVER === "pg" || process.env.USE_NODE_PG === "true";
const isNeonUrl = /neon\.tech|neon\.database|neon\.build|neon\.cloud/i.test(connectionString);
const useNodePg = preferNodePg || !isNeonUrl;

const { Pool } = pg;
let db: any;

if (useNodePg) {
  const pool = new Pool({ connectionString });
  db = drizzleNode(pool, { schema });
  db.$client = pool;
} else {
  const sql = neon(connectionString);

  // Adapter to support drizzle's call signature while keeping tagged-template support.
  const client: NeonQueryFunction<any, any> = Object.assign(
    (first: TemplateStringsArray | string, ...rest: unknown[]) => {
      if (Array.isArray(first) && Array.isArray((first as TemplateStringsArray).raw)) {
        return sql(first as TemplateStringsArray, ...rest);
      }

      const [params, options] = rest;
      return sql.query(first as string, (params as unknown[]) ?? [], options as never);
    },
    {
      query: sql.query.bind(sql),
      unsafe: sql.unsafe.bind(sql),
      transaction: sql.transaction.bind(sql)
    }
  );

  db = drizzleNeon({ client, schema });
  db.$client = client;
}

export { db };

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL manquant (voir backend/.env)");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool);

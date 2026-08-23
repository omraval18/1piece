import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * `pg-connection-string` warns whenever it sees a literal sslmode of
 * prefer/require/verify-ca in the URL, even though the connection itself is
 * fine (it treats all of those as verify-full today anyway). Rather than
 * depend on an exact string match in an env var, strip sslmode out of the
 * URL entirely and set TLS behavior explicitly here — this can't drift.
 */
function poolConfig(): { connectionString?: string; ssl?: { rejectUnauthorized: boolean } } {
  const raw = process.env.DATABASE_URL;
  if (!raw) return {};

  try {
    const url = new URL(raw);
    const sslmode = url.searchParams.get("sslmode");
    url.searchParams.delete("sslmode");

    if (!sslmode || sslmode === "disable") {
      return { connectionString: url.toString() };
    }
    return { connectionString: url.toString(), ssl: { rejectUnauthorized: true } };
  } catch {
    // Malformed/unparseable — fall back to the raw string rather than crash.
    return { connectionString: raw };
  }
}

const pool = new Pool(poolConfig());

export const db = drizzle(pool, { schema });

/**
 * Set Supabase-compatible JWT claim GUCs inside a Postgres transaction.
 * Required so SECURITY DEFINER RPCs (mark_order_paid, is_admin_or_staff)
 * and any remaining auth.uid()-based guards see a real caller context.
 *
 * Always use is_local=true (transaction-scoped) — never session-scoped —
 * so pooled connections cannot leak claims to the next borrower.
 */

import type { PoolClient } from "pg";
import { getPool } from "./pool";

export type JwtDbContext = {
  role?: string | null;
  sub?: string | null;
};

export async function applyJwtContext(
  client: PoolClient,
  ctx: JwtDbContext
): Promise<void> {
  const role = ctx.role || "";
  const sub = ctx.sub || "";
  const claims = JSON.stringify({
    role: role || undefined,
    sub: sub || undefined,
  });

  await client.query(`SELECT set_config('request.jwt.claim.role', $1, true)`, [
    role,
  ]);
  await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [
    sub,
  ]);
  await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
    claims,
  ]);
}

/**
 * Run work inside BEGIN…COMMIT with JWT claims applied.
 */
export async function withJwtContext<T>(
  ctx: JwtDbContext,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await applyJwtContext(client, ctx);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }
    throw err;
  } finally {
    client.release();
  }
}

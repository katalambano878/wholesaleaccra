import { NextRequest, NextResponse } from "next/server";
import { applyPostgrestParams } from "@/lib/db/supabase-compat";
import { isPlainPostgres } from "@/lib/db/mode";
import {
  resolveRestCaller,
  clientForCaller,
  canReadTable,
  canMutateTable,
} from "@/lib/db/rest-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PG_IDENT = /^[a-z_][a-z0-9_]*$/i;

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, prefer, x-client-info, accept-profile, content-profile",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  };
}

function preferSingle(req: NextRequest): boolean {
  const accept = req.headers.get("accept") || "";
  return accept.includes("application/vnd.pgrst.object+json");
}

function preferReturn(req: NextRequest): boolean {
  const prefer = req.headers.get("prefer") || "";
  return prefer.includes("return=representation") || prefer.includes("resolution=");
}

function preferCount(req: NextRequest): boolean {
  const prefer = req.headers.get("prefer") || "";
  return prefer.includes("count=exact");
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { message, code: "PGRST", details: null, hint: null },
    { status, headers: corsHeaders() }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ table: string }> }
) {
  if (!isPlainPostgres()) {
    return jsonError("Plain Postgres mode is not enabled (DATABASE_URL missing)", 503);
  }
  const { table } = await ctx.params;
  if (!PG_IDENT.test(table)) return jsonError("Invalid table");

  const caller = await resolveRestCaller(req);
  if (!canReadTable(caller, table)) {
    return jsonError("Insufficient privileges", 401);
  }

  const client = clientForCaller(caller);
  const qb = client.from(table);
  const select = req.nextUrl.searchParams.get("select") || "*";
  if (preferCount(req)) {
    qb.select(select, {
      count: "exact",
      head: req.headers.get("prefer")?.includes("head=true"),
    });
  } else {
    qb.select(select);
  }
  const params = new URLSearchParams(req.nextUrl.searchParams);
  params.delete("select");
  applyPostgrestParams(qb as any, params, {
    preferSingle: preferSingle(req),
  });

  const result = await qb;
  if (result.error) {
    return jsonError(result.error.message || "Query failed", 400);
  }

  const headers = new Headers(corsHeaders());
  headers.set("Content-Type", "application/json");
  if (result.count != null) {
    const len = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0;
    const offset = Number(req.nextUrl.searchParams.get("offset") || 0);
    const end = len === 0 ? offset : offset + len - 1;
    headers.set("Content-Range", `${offset}-${end}/${result.count}`);
  }

  if (preferSingle(req)) {
    return NextResponse.json(result.data, { status: 200, headers });
  }
  return NextResponse.json(result.data ?? [], { status: 200, headers });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ table: string }> }
) {
  if (!isPlainPostgres()) {
    return jsonError("Plain Postgres mode is not enabled (DATABASE_URL missing)", 503);
  }
  const { table } = await ctx.params;
  if (!PG_IDENT.test(table)) return jsonError("Invalid table");

  const caller = await resolveRestCaller(req);
  if (!canMutateTable(caller, table, "POST")) {
    return jsonError("Insufficient privileges", 401);
  }

  const body = await req.json().catch(() => null);
  if (body == null) return jsonError("Invalid JSON body");

  const client = clientForCaller(caller);
  let qb = client.from(table).insert(body);
  if (preferReturn(req) || preferSingle(req)) {
    qb = qb.select("*") as typeof qb;
  }
  if (preferSingle(req)) qb = qb.single() as typeof qb;

  const result = await qb;
  if (result.error) return jsonError(result.error.message || "Insert failed", 400);

  return NextResponse.json(result.data, {
    status: 201,
    headers: corsHeaders(),
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ table: string }> }
) {
  if (!isPlainPostgres()) {
    return jsonError("Plain Postgres mode is not enabled (DATABASE_URL missing)", 503);
  }
  const { table } = await ctx.params;
  if (!PG_IDENT.test(table)) return jsonError("Invalid table");

  const caller = await resolveRestCaller(req);
  if (!canMutateTable(caller, table, "PATCH")) {
    return jsonError("Insufficient privileges", 401);
  }

  const body = await req.json().catch(() => null);
  if (body == null || typeof body !== "object") return jsonError("Invalid JSON body");

  // Guests must not mass-update payment/status fields on orders.
  if (
    table === "orders" &&
    !caller.isAdmin &&
    caller.role !== "service_role" &&
    body &&
    typeof body === "object" &&
    ("payment_status" in body || "status" in body || "total" in body)
  ) {
    return jsonError("Cannot update protected order fields", 403);
  }

  const client = clientForCaller(caller);
  let qb = client.from(table).update(body);
  applyPostgrestParams(qb as any, req.nextUrl.searchParams);
  if (preferReturn(req) || preferSingle(req)) {
    qb = qb.select("*") as typeof qb;
  }
  if (preferSingle(req)) qb = qb.single() as typeof qb;

  const result = await qb;
  if (result.error) return jsonError(result.error.message || "Update failed", 400);

  return NextResponse.json(result.data, { status: 200, headers: corsHeaders() });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ table: string }> }
) {
  if (!isPlainPostgres()) {
    return jsonError("Plain Postgres mode is not enabled (DATABASE_URL missing)", 503);
  }
  const { table } = await ctx.params;
  if (!PG_IDENT.test(table)) return jsonError("Invalid table");

  const caller = await resolveRestCaller(req);
  if (!canMutateTable(caller, table, "DELETE")) {
    return jsonError("Insufficient privileges", 401);
  }

  // Non-admins may only delete cart/wishlist rows.
  if (
    !caller.isAdmin &&
    caller.role !== "service_role" &&
    !["cart_items", "wishlist_items", "notifications"].includes(table)
  ) {
    return jsonError("Insufficient privileges", 403);
  }

  const client = clientForCaller(caller);
  let qb = client.from(table).delete();
  applyPostgrestParams(qb as any, req.nextUrl.searchParams);
  if (preferReturn(req)) {
    qb = qb.select("*") as typeof qb;
  }

  const result = await qb;
  if (result.error) return jsonError(result.error.message || "Delete failed", 400);

  return NextResponse.json(result.data ?? null, { status: 200, headers: corsHeaders() });
}

import { NextRequest, NextResponse } from "next/server";
import { isPlainPostgres } from "@/lib/db/mode";
import {
  resolveRestCaller,
  clientForCaller,
  canCallRpc,
} from "@/lib/db/rest-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PG_IDENT = /^[a-z_][a-z0-9_]*$/i;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    },
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ fn: string }> }
) {
  if (!isPlainPostgres()) {
    return NextResponse.json({ message: "DATABASE_URL not set" }, { status: 503 });
  }
  const { fn } = await ctx.params;
  if (!PG_IDENT.test(fn)) {
    return NextResponse.json({ message: "Invalid function name" }, { status: 400 });
  }

  const caller = await resolveRestCaller(req);
  if (!canCallRpc(caller, fn)) {
    return NextResponse.json(
      { message: "Insufficient privileges to call this function", code: "42501" },
      { status: 401 }
    );
  }

  const args = (await req.json().catch(() => ({}))) as Record<string, any>;
  const client = clientForCaller(caller);
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    return NextResponse.json(
      { message: error.message, code: "PGRST202" },
      { status: 400 }
    );
  }
  return NextResponse.json(data);
}

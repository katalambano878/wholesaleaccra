/**
 * Authorization helpers for the /rest/v1 and /storage/v1 shims.
 * Browser supabase-js sends `apikey` + `Authorization: Bearer <jwt>`.
 */

import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { authJwtSecret } from "./mode";
import { createClient, type CompatClientOptions } from "./supabase-compat";

export type RestCaller = {
  userId: string | null;
  role: string; // anon | authenticated | admin | staff | service_role
  isAdmin: boolean;
  isAuthenticated: boolean;
};

const PUBLIC_READ_TABLES = new Set([
  "products",
  "product_images",
  "product_variants",
  "categories",
  "blog_posts",
  "pages",
  "banners",
  "navigation_menus",
  "navigation_items",
  "cms_content",
  "site_settings",
  "store_settings",
  "store_modules",
  "coupons",
  "reviews",
  "review_images",
]);

/** Tables guests may INSERT into (checkout / contact / etc.). */
const PUBLIC_INSERT_TABLES = new Set([
  "orders",
  "order_items",
  "contact_submissions",
  "customers",
  "reviews",
  "review_images",
  "support_tickets",
  "support_messages",
  "return_requests",
  "return_items",
  "wishlist_items",
  "cart_items",
  "notifications",
]);

/** RPCs callable without admin (guest checkout helpers). */
const PUBLIC_RPC = new Set(["upsert_customer_from_order"]);

/** RPCs that require admin/staff JWT. */
const ADMIN_RPC = new Set([
  "mark_order_paid",
  "update_customer_stats",
  "get_all_customer_emails",
  "get_all_customer_phones",
  "reduce_stock_on_order",
]);

export async function resolveRestCaller(req: NextRequest): Promise<RestCaller> {
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const apikey = req.headers.get("apikey") || "";

  // Explicit service-role key (server-to-server) — treat as service_role.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    (bearer && serviceKey && bearer === serviceKey) ||
    (apikey && serviceKey && apikey === serviceKey)
  ) {
    return {
      userId: null,
      role: "service_role",
      isAdmin: true,
      isAuthenticated: true,
    };
  }

  if (!bearer) {
    return {
      userId: null,
      role: "anon",
      isAdmin: false,
      isAuthenticated: false,
    };
  }

  try {
    const { payload } = await jwtVerify(
      bearer,
      new TextEncoder().encode(authJwtSecret())
    );
    if (payload.typ === "refresh") {
      return {
        userId: null,
        role: "anon",
        isAdmin: false,
        isAuthenticated: false,
      };
    }
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    const appMeta = (payload.app_metadata || {}) as { role?: string };
    const profileRole = appMeta.role || "authenticated";
    const isAdmin = profileRole === "admin" || profileRole === "staff";
    return {
      userId,
      role: isAdmin ? profileRole : "authenticated",
      isAdmin,
      isAuthenticated: !!userId,
    };
  } catch {
    return {
      userId: null,
      role: "anon",
      isAdmin: false,
      isAuthenticated: false,
    };
  }
}

export function clientForCaller(caller: RestCaller) {
  // JWT GUCs must use GoTrue-style roles (service_role | authenticated | anon).
  // Profile roles (admin/staff) are enforced via auth.uid() + is_admin_or_staff().
  const jwtRole =
    caller.role === "service_role"
      ? "service_role"
      : caller.isAuthenticated
        ? "authenticated"
        : "anon";
  const opts: CompatClientOptions = {
    serviceRole: jwtRole === "service_role",
    userId: caller.userId,
    role: jwtRole,
  };
  return createClient(
    undefined,
    opts.serviceRole ? "service_role" : undefined,
    opts
  );
}

export function canReadTable(caller: RestCaller, table: string): boolean {
  if (caller.isAdmin || caller.role === "service_role") return true;
  if (PUBLIC_READ_TABLES.has(table)) return true;
  // Authenticated users may read their own rows (enforced loosely — app filters).
  if (caller.isAuthenticated) return true;
  // Guest order lookup by order_number is common on storefront.
  if (table === "orders" || table === "order_items" || table === "order_status_history") {
    return true;
  }
  if (table === "customers") return true; // upsert_customer paths
  return false;
}

export function canMutateTable(
  caller: RestCaller,
  table: string,
  method: "POST" | "PATCH" | "DELETE"
): boolean {
  if (caller.isAdmin || caller.role === "service_role") return true;
  if (method === "POST" && PUBLIC_INSERT_TABLES.has(table)) return true;
  // Authenticated users may update own profile / addresses / carts.
  if (
    caller.isAuthenticated &&
    ["profiles", "addresses", "cart_items", "wishlist_items", "notifications", "orders"].includes(
      table
    )
  ) {
    return true;
  }
  return false;
}

export function canCallRpc(caller: RestCaller, fn: string): boolean {
  if (caller.isAdmin || caller.role === "service_role") return true;
  if (ADMIN_RPC.has(fn)) return false;
  if (PUBLIC_RPC.has(fn)) return true;
  // Unknown RPCs: require authentication at minimum.
  return caller.isAuthenticated;
}

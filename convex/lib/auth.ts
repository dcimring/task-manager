import { QueryCtx, MutationCtx } from "../_generated/server";

// Every query and mutation must call this. Fails closed: if ALLOWED_EMAILS
// is unset, nobody is authorized.
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = identity.email?.toLowerCase();
  // OIDC providers normalize the claim to `emailVerified`; our customJwt
  // provider (convex/auth.config.ts) passes it through raw as `email_verified`.
  const emailVerified =
    identity.emailVerified === true ||
    (identity as { email_verified?: unknown }).email_verified === true;
  if (!email || !emailVerified || !allowed.includes(email)) {
    throw new Error("Not authorized");
  }
  return identity;
}

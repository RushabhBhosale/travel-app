import { createClerkClient, verifyToken } from "@clerk/backend";
import User from "../models/user.js";

const secretKey = process.env.CLERK_SECRET_KEY;
const clerk = secretKey ? createClerkClient({ secretKey }) : null;

if (!secretKey) {
  console.warn(
    "[auth] CLERK_SECRET_KEY is not set: falling back to the unverified clerkUserId sent by the client. Set it in production."
  );
}

/**
 * Resolves the signed-in Clerk user for the request.
 * With CLERK_SECRET_KEY set, the bearer token is verified and is the only
 * source of identity. Without it (local dev), the client-supplied id is used.
 */
export async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (secretKey) {
    if (!token) return res.status(401).json({ error: "Not signed in" });
    // verifyToken throws (rather than returning errors) for bad tokens and for a
    // misconfigured CLERK_SECRET_KEY, so both paths must become a clean 401.
    let result;
    try {
      result = await verifyToken(token, { secretKey });
    } catch (err) {
      result = { errors: [err] };
    }
    const { data, errors } = result;
    if (errors?.length || !data?.sub) {
      const reason = errors?.[0]?.reason || "invalid-token";
      console.warn(`[auth] Token verification failed: ${reason}: ${errors?.[0]?.message || ""}`);
      const misconfigured = reason === "secret-key-invalid" || reason === "jwk-failed-to-resolve";
      return res.status(401).json({
        error: misconfigured
          ? "The server's sign-in configuration is invalid. Check CLERK_SECRET_KEY."
          : "Session expired, please sign in again",
        reason,
      });
    }
    req.clerkUserId = data.sub;
    return next();
  }

  const clerkUserId =
    req.get("x-clerk-user-id") || req.query.clerkUserId || req.body?.clerkUserId;
  if (!clerkUserId) return res.status(401).json({ error: "Not signed in" });
  req.clerkUserId = String(clerkUserId);
  next();
}

/** Creates or refreshes the local user record for the signed-in Clerk user. */
export async function upsertUser(clerkUserId, fallback = {}) {
  let email = fallback.email;
  let name = fallback.name;

  if (clerk) {
    try {
      const u = await clerk.users.getUser(clerkUserId);
      email = u.primaryEmailAddress?.emailAddress || email;
      name = [u.firstName, u.lastName].filter(Boolean).join(" ") || name;
    } catch (err) {
      console.warn("[auth] Could not load Clerk user", err?.message);
    }
  }

  const existing = await User.findOne({ clerkUserId });
  if (existing) {
    let dirty = false;
    if (email && existing.email !== email) (existing.email = email), (dirty = true);
    if (name && existing.name !== name) (existing.name = name), (dirty = true);
    if (dirty) await existing.save();
    return existing;
  }
  if (!email) return null;
  return User.create({ clerkUserId, email, name });
}

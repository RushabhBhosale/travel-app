import { createClerkClient } from "@clerk/backend";
import { createRemoteJWKSet, jwtVerify } from "jose";
import User from "../models/user.js";

const clean = (v) => v?.trim().replace(/^["']|["']$/g, "") || undefined;

// The publishable key is public and encodes the Clerk Frontend API domain, whose
// JWKS endpoint serves the keys that sign session tokens. Verifying against it
// needs no secret. Defaults to the key the mobile app ships with.
const publishableKey =
  clean(process.env.CLERK_PUBLISHABLE_KEY) || "pk_test_cmVhZHktZ251LTIzLmNsZXJrLmFjY291bnRzLmRldiQ";
const frontendApi = Buffer.from(publishableKey.split("_")[2] || "", "base64").toString().replace(/\$$/, "");
const issuer = `https://${frontendApi}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

// Optional: only used to look up a user's email/name from Clerk.
const secretKey = clean(process.env.CLERK_SECRET_KEY);
const clerk = secretKey ? createClerkClient({ secretKey }) : null;

// For local scripts only: accept an unverified x-clerk-user-id header.
const allowDevAuth = process.env.ALLOW_DEV_AUTH === "1";

/**
 * Resolves the signed-in Clerk user from the bearer token, verifying its
 * signature, issuer and expiry against the Clerk instance's public keys.
 */
export async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    const devId = allowDevAuth && (req.get("x-clerk-user-id") || req.query.clerkUserId);
    if (devId) {
      req.clerkUserId = String(devId);
      return next();
    }
    return res.status(401).json({ error: "Not signed in" });
  }

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, clockTolerance: 10 });
    if (!payload.sub) throw new Error("Token has no subject");
    req.clerkUserId = payload.sub;
    return next();
  } catch (err) {
    const reason = err?.code || "invalid-token";
    console.warn(`[auth] Token verification failed: ${reason}: ${err?.message || ""}`);
    return res.status(401).json({ error: "Session expired, please sign in again", reason });
  }
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

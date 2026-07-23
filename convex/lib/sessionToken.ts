import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  createLocalJWKSet,
  createRemoteJWKSet,
} from "jose";

// We stop using Google's ~1h ID token as the Convex session credential and
// instead mint our own long-lived, sliding session token here. Google is
// verified once (at login / when the session token has fully expired); after
// that the app renews its own token silently, so a login lasts as long as the
// app is used at least once every SESSION_TTL_SECONDS.
const ALG = "RS256";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function siteUrl(): string {
  const url = process.env.CONVEX_SITE_URL;
  if (!url) throw new Error("CONVEX_SITE_URL not set");
  return url;
}

function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

type SessionUser = { email: string; name?: string; sub: string };

// --- signing (private key lives only in the JWT_PRIVATE_KEY deployment var) ---

let privateKeyPromise: Promise<CryptoKey> | null = null;
function getPrivateKey(): Promise<CryptoKey> {
  if (!privateKeyPromise) {
    const pem = process.env.JWT_PRIVATE_KEY;
    if (!pem) throw new Error("JWT_PRIVATE_KEY not set");
    privateKeyPromise = importPKCS8(pem, ALG);
  }
  return privateKeyPromise;
}

function keyId(): string {
  const jwks = JSON.parse(process.env.JWKS ?? '{"keys":[]}');
  const kid = jwks.keys?.[0]?.kid;
  if (!kid) throw new Error("JWKS not set");
  return kid;
}

export async function mintSessionToken(
  user: SessionUser
): Promise<{ token: string; exp: number }> {
  const key = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_TTL_SECONDS;
  const token = await new SignJWT({
    email: user.email,
    email_verified: true,
    name: user.name ?? "User",
  })
    .setProtectedHeader({ alg: ALG, kid: keyId() })
    .setSubject(user.sub)
    .setIssuer(siteUrl())
    .setAudience(siteUrl())
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);
  return { token, exp };
}

// --- verification ---

// Google Identity Services ID token (used at login).
const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export async function verifyGoogleToken(token: string): Promise<SessionUser> {
  const clientId = process.env.AUTH_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("AUTH_GOOGLE_CLIENT_ID not set");
  const { payload } = await jwtVerify(token, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  const email = String(payload.email ?? "").toLowerCase();
  if (!email || payload.email_verified !== true) {
    throw new Error("email not verified");
  }
  if (!allowedEmails().includes(email)) throw new Error("email not allowed");
  return { email, name: payload.name as string | undefined, sub: String(payload.sub) };
}

// One of our own session tokens (used for silent sliding renewal). Re-checks
// the allow-list so revoking access stops renewals as soon as the current
// token expires.
export async function verifySessionToken(token: string): Promise<SessionUser> {
  const localJwks = createLocalJWKSet(JSON.parse(process.env.JWKS ?? '{"keys":[]}'));
  const { payload } = await jwtVerify(token, localJwks, {
    issuer: siteUrl(),
    audience: siteUrl(),
  });
  const email = String(payload.email ?? "").toLowerCase();
  if (!email || !allowedEmails().includes(email)) throw new Error("email not allowed");
  return { email, name: payload.name as string | undefined, sub: String(payload.sub) };
}

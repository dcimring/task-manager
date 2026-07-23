import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import {
  verifyGoogleToken,
  verifySessionToken,
  mintSessionToken,
} from "./lib/sessionToken";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const http = httpRouter();

// Preflight for the browser calling from the app's origin.
http.route({
  path: "/auth/session",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
});

// Exchange a Google ID token (login) OR a still-valid session token (silent
// renewal) for a fresh long-lived session token.
http.route({
  path: "/auth/session",
  method: "POST",
  handler: httpAction(async (_ctx, req) => {
    let body: { googleToken?: unknown; sessionToken?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "bad request" }, 400);
    }
    try {
      let user;
      if (typeof body.googleToken === "string") {
        user = await verifyGoogleToken(body.googleToken);
      } else if (typeof body.sessionToken === "string") {
        user = await verifySessionToken(body.sessionToken);
      } else {
        return json({ error: "missing token" }, 400);
      }
      const { token, exp } = await mintSessionToken(user);
      return json({ token, exp, email: user.email, name: user.name ?? "User" }, 200);
    } catch {
      return json({ error: "unauthorized" }, 401);
    }
  }),
});

// Public keys so Convex (and anyone) can verify our session tokens. Referenced
// by convex/auth.config.ts.
http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(process.env.JWKS ?? '{"keys":[]}', {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

export default http;

// Convex trusts session tokens minted by convex/http.ts (POST /auth/session),
// not raw Google ID tokens. Those tokens are signed with our own key and
// verified against the JWKS we serve at /.well-known/jwks.json. This decouples
// the app session length from Google's fixed ~1h ID-token lifetime. Google is
// still verified server-side inside the /auth/session endpoint at login time.
const siteUrl = process.env.CONVEX_SITE_URL!;

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: siteUrl,
      issuer: siteUrl,
      jwks: `${siteUrl}/.well-known/jwks.json`,
      algorithm: "RS256",
    },
  ],
};

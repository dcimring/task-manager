// Convex verifies Google Identity Services ID tokens against Google's JWKS.
// The `aud` claim of each token must match the OAuth client ID.
export default {
  providers: [
    {
      domain: "https://accounts.google.com",
      applicationID: process.env.AUTH_GOOGLE_CLIENT_ID!,
    },
  ],
};

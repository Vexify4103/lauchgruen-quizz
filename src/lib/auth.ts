import NextAuth, { type DefaultSession } from "next-auth";
import Twitch from "next-auth/providers/twitch";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      twitchLogin: string;
    } & DefaultSession["user"];
  }
}

type TwitchProfile = {
  preferred_username?: string;
};

type TwitchToken = {
  twitchLogin?: string;
};

const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
const useSecureCookies = authUrl.startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const cookieName = (name: string) => `${cookiePrefix}quizduell.${name}`;
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: useSecureCookies,
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the Host header — required when running behind a reverse proxy
  // (Pterodactyl, nginx, Cloudflare, etc.). Without this, Auth.js v5 throws
  // UntrustedHost in production for every /api/auth/* request.
  // Safe because the proxy is the one terminating TLS and setting Host.
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: cookieName("session-token"),
      options: cookieOptions,
    },
    callbackUrl: {
      name: cookieName("callback-url"),
      options: {
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: cookieName("csrf-token"),
      options: cookieOptions,
    },
    pkceCodeVerifier: {
      name: cookieName("pkce.code_verifier"),
      options: {
        ...cookieOptions,
        maxAge: 60 * 15,
      },
    },
    state: {
      name: cookieName("state"),
      options: {
        ...cookieOptions,
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: cookieName("nonce"),
      options: {
        ...cookieOptions,
        maxAge: 60 * 15,
      },
    },
  },
  providers: [
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      authorization: { params: { scope: "openid user:read:email" } },
      checks: ["state"],
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (process.env.AUTH_DEBUG === "true") {
        console.log("[auth:redirect]", { url, baseUrl });
      }

      return url.startsWith(baseUrl) ? url : baseUrl;
    },
    async jwt({ token, profile, account }) {
      const appToken = token as typeof token & TwitchToken;

      if (profile && account?.provider === "twitch") {
        const tp = profile as TwitchProfile;
        appToken.twitchLogin =
          tp.preferred_username ?? (typeof token.name === "string" ? token.name : "");
      }

      return appToken;
    },
    async session({ session, token }) {
      const appToken = token as typeof token & TwitchToken;

      if (token.sub) session.user.id = token.sub;
      const fromToken = typeof appToken.twitchLogin === "string" ? appToken.twitchLogin : "";
      const name: string = typeof token.name === "string" ? token.name : "";
      session.user.twitchLogin = fromToken || name;
      return session;
    },
  },
});

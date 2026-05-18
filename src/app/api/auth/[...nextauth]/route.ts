import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (
    process.env.AUTH_DEBUG === "true" &&
    request.nextUrl.pathname.includes("/api/auth/callback/")
  ) {
    const names = request.cookies.getAll().map((cookie) => cookie.name).sort();
    console.log("[auth:callback-cookies]", {
      host: request.headers.get("host"),
      url: request.nextUrl.toString(),
      hasQuizPkce: names.includes("quizduell.pkce.code_verifier"),
      hasDefaultPkce: names.includes("authjs.pkce.code_verifier"),
      authCookies: names.filter(
        (name) => name.startsWith("quizduell.") || name.startsWith("authjs."),
      ),
    });
  }

  return handlers.GET(request);
}

export const { POST } = handlers;

import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { detectCityFromHeaders } from "@/lib/location/detectCityFromHeaders";
import {
  CITY_COOKIE,
  CITY_COOKIE_MAX_AGE_SECONDS,
  CITY_SOURCE_COOKIE,
} from "@/lib/location/cityCookie";

const { auth } = NextAuth(authConfig);

function stampDetectedCity(req: NextRequest, res: NextResponse): NextResponse {
  if (req.cookies.get(CITY_COOKIE)) return res;
  const detected = detectCityFromHeaders(req.headers);
  if (!detected) return res;
  const cookieOpts = {
    maxAge: CITY_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
  };
  res.cookies.set(CITY_COOKIE, detected.slug, cookieOpts);
  // Source flag lets the header picker prompt "Not your city? Change it" on
  // IP-detected sessions without nagging users who picked manually.
  res.cookies.set(CITY_SOURCE_COOKIE, "ip", cookieOpts);
  return res;
}

// `auth(...)` wraps our middleware so the `authorized` callback in
// `authConfig` can short-circuit protected paths to a /login redirect.
// We layer the IP→city cookie on whichever response comes back.
export default auth((req) => {
  return stampDetectedCity(req as unknown as NextRequest, NextResponse.next());
});

export const config = {
  // Run on all routes except internal Next assets and static files so that
  // the IP→city cookie is stamped on the very first visit, while still
  // routing /profile, /collections/create and /discussions/new through the
  // NextAuth `authorized` callback declared in auth.config.ts.
  matcher: [
    "/((?!_next/static|_next/image|api/auth|favicon|brand|icon-|apple-touch|og-|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|js|css|woff2?)).*)",
  ],
};

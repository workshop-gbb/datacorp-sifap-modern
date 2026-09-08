import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/lib/i18n";

export function middleware(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/")[1];
  const locale = isLocale(segment) ? segment : "pt-BR";
  const headers = new Headers(request.headers);
  headers.set("x-sifap-locale", locale);
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!_next|favicon.ico|healthz).*)"] };

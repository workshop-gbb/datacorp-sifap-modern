import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { Locale } from "./i18n";
export const SESSION_COOKIE = "sifap_session";

export function apiUrl(path: string): string {
  const origin = process.env.API_URL;
  if (!origin) throw new Error("API_URL is not configured");
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Invalid API path");
  return `${origin.replace(/\/$/, "")}/api/v1${path}`;
}
export async function api<T>(path: string, locale: Locale): Promise<T> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) redirect(`/${locale}/login`);
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${session}` },
    cache: "no-store",
    signal: AbortSignal.timeout(18000),
    redirect: "error",
  });
  if (response.status === 401 || response.status === 403)
    redirect(`/${locale}/login?expired=1`);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

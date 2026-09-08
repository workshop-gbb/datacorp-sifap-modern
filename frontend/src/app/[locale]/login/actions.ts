"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiUrl, SESSION_COOKIE } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

export interface LoginState {
  error?: "invalidCredentials" | "rateLimited" | "unavailable" | "invalidInput";
}
export async function login(
  _state: LoginState,
  form: FormData,
): Promise<LoginState> {
  const locale = String(form.get("locale") ?? "");
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (
    !isLocale(locale) ||
    !username ||
    username.length > 64 ||
    !password ||
    password.length > 128
  )
    return { error: "invalidInput" };
  return createSession(locale, "/auth/login", { username, password });
}

export async function enterViewer(
  _state: LoginState,
  form: FormData,
): Promise<LoginState> {
  const locale = String(form.get("locale") ?? "");
  if (!isLocale(locale)) return { error: "invalidInput" };
  if (process.env.SIFAP_GUEST_VIEWER_ENABLED !== "true")
    return { error: "unavailable" };
  return createSession(locale, "/auth/viewer");
}

async function createSession(
  locale: string,
  path: string,
  credentials?: { username: string; password: string },
): Promise<LoginState> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: credentials ? JSON.stringify(credentials) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof DOMException &&
        ["TimeoutError", "AbortError"].includes(error.name))
    )
      return { error: "unavailable" };
    throw error;
  }
  if (response.status === 401) return { error: "invalidCredentials" };
  if (response.status === 429) return { error: "rateLimited" };
  if (!response.ok) return { error: "unavailable" };
  const session: unknown = await response.json();
  if (
    typeof session !== "object" ||
    session === null ||
    !("accessToken" in session) ||
    typeof session.accessToken !== "string" ||
    !("expiresIn" in session) ||
    typeof session.expiresIn !== "number" ||
    session.expiresIn <= 0 ||
    session.expiresIn > 3600
  )
    throw new Error("Invalid authentication contract");
  (await cookies()).set(SESSION_COOKIE, session.accessToken, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: session.expiresIn,
  });
  redirect(`/${locale}/dashboard`);
}
export async function logout(form: FormData) {
  const requested = String(form.get("locale") ?? "");
  const locale = isLocale(requested) ? requested : "pt-BR";
  (await cookies()).delete(SESSION_COOKIE);
  redirect(`/${locale}/login`);
}

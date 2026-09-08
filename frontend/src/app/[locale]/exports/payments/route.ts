import { cookies } from "next/headers";
import { apiUrl, SESSION_COOKIE } from "@/lib/api";
import { dictionary, isLocale } from "@/lib/i18n";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token)
    return Response.redirect(new URL(`/${locale}/login`, request.url));
  const input = new URL(request.url).searchParams;
  const query = new URLSearchParams({ locale });
  for (const key of ["period", "program", "state"]) {
    const value = input.get(key);
    if (value) query.set(key, value);
  }
  const response = await fetch(apiUrl(`/reports/payments.csv?${query}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(18000),
  });
  if (response.status === 401 || response.status === 403)
    return Response.redirect(new URL(`/${locale}/login`, request.url));
  if (!response.ok)
    return new Response(dictionary(locale).unavailable, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition":
        response.headers.get("Content-Disposition") ??
        'attachment; filename="sifap-synthetic.csv"',
    },
  });
}

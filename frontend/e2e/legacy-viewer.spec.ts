import { test, expect } from "@playwright/test";
const origin =
  process.env.SIFAP_LEGACY_BASE_URL ??
  "https://sifap-lab-438k30.eastus2.cloudapp.azure.com";

for (const [locale, title, access, signout] of [
  ["pt-BR", "O futuro começa", "Acessar SIFAP legado", "Sair"],
  ["en", "The future begins", "Access legacy SIFAP", "Sign out"],
  ["es", "El futuro comienza", "Acceder a SIFAP legado", "Salir"],
] as const) {
  test(`legacy ${locale}: public retro landing and one-click restricted terminal`, async ({
    page,
    context,
  }) => {
    // REQ-116 REQ-117 REQ-118 REQ-119
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto(`${origin}/${locale}/`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["www-authenticate"]).toBeUndefined();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: access, exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/viewer\\?locale=${locale}$`));
    const session = (await context.cookies()).find(
      (c) => c.name === "sifap_viewer",
    );
    expect(session?.httpOnly).toBe(true);
    expect(session?.secure).toBe(true);
    expect(session?.sameSite).toBe("Strict");
    await expect(page.frameLocator("iframe").locator(".xterm")).toBeVisible({
      timeout: 20000,
    });
    await expect(
      page.frameLocator("iframe").locator(".xterm-screen"),
    ).toBeVisible();
    expect(
      (
        await context.request.get(`${origin}/admin/`, { maxRedirects: 0 })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.get(`${origin}/admin`, { maxRedirects: 0 })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.get(`${origin}/terminal/`, {
          headers: { "X-Sifap-Role": "ADMIN", "X-Forwarded-User": "operator" },
          maxRedirects: 0,
        })
      ).status(),
    ).toBe(200);
    await page.getByRole("button", { name: signout, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/$`));
    expect(
      (await context.cookies()).some((c) => c.name === "sifap_viewer"),
    ).toBe(false);
    expect(
      (
        await context.request.get(`${origin}/terminal/`, { maxRedirects: 0 })
      ).status(),
    ).toBe(303);
  });
}

test("legacy: cross-origin, forged, and role-injected access are denied", async ({
  request,
}) => {
  // REQ-118 REQ-119
  expect(
    (
      await request.post(`${origin}/auth/viewer`, {
        headers: { Origin: "https://untrusted.invalid" },
        form: { locale: "en" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`${origin}/auth/viewer`, {
        headers: { Origin: origin },
        form: { locale: "en", role: "ADMIN" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get(`${origin}/viewer`, {
        headers: { Cookie: "sifap_viewer=forged" },
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(303);
  expect(
    (await request.get(`${origin}/admin/`, { maxRedirects: 0 })).status(),
  ).toBe(401);
});

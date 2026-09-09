import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const origin =
  process.env.SIFAP_LEGACY_BASE_URL ??
  "https://sifap-lab-438k30.eastus2.cloudapp.azure.com";

function credentials(role: "ADMIN" | "VIEWER") {
  const file = process.env.SIFAP_TEST_SECRET_FILE;
  const data = file ? JSON.parse(readFileSync(file, "utf8")) : process.env;
  const password = data[`SIFAP_${role}_PASSWORD`];
  if (typeof password !== "string")
    throw new Error(`Missing ${role} legacy credential`);
  return {
    username: data[`SIFAP_${role}_USERNAME`] ?? role.toLowerCase(),
    password,
  };
}

async function signIn(
  page: Page,
  locale: string,
  role: "ADMIN" | "VIEWER",
  labels: Labels,
) {
  const account = credentials(role);
  await page.goto(`${origin}/${locale}/#acesso`);
  await page
    .getByLabel(labels.username, { exact: true })
    .fill(account.username);
  await page
    .getByLabel(labels.password, { exact: true })
    .fill(account.password);
  await page.getByRole("button", { name: labels.signIn, exact: true }).click();
}

interface Labels {
  title: string;
  username: string;
  password: string;
  signIn: string;
  signOut: string;
  invalid: string;
}

const locales: Array<[string, Labels]> = [
  [
    "pt-BR",
    {
      title: "O futuro começa",
      username: "Usuário",
      password: "Senha",
      signIn: "Entrar",
      signOut: "Sair",
      invalid: "Usuário ou senha incorretos.",
    },
  ],
  [
    "en",
    {
      title: "The future begins",
      username: "Username",
      password: "Password",
      signIn: "Sign in",
      signOut: "Sign out",
      invalid: "Incorrect username or password.",
    },
  ],
  [
    "es",
    {
      title: "El futuro comienza",
      username: "Usuario",
      password: "Contraseña",
      signIn: "Acceder",
      signOut: "Salir",
      invalid: "Usuario o contraseña incorrectos.",
    },
  ],
];

for (const [locale, labels] of locales) {
  test(`legacy ${locale}: retro landing signs a viewer in and reaches the Natural screen`, async ({
    page,
    context,
  }) => {
    // REQ-116 REQ-121 REQ-122 REQ-124
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto(`${origin}/${locale}/`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["www-authenticate"]).toBeUndefined();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      labels.title,
    );
    await expect(
      page.getByLabel(labels.password, { exact: true }),
    ).toHaveAttribute("type", "password");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page, locale, "VIEWER", labels);
    await expect(page).toHaveURL(new RegExp(`/viewer\\?locale=${locale}$`));
    const session = (await context.cookies()).find(
      (c) => c.name === "sifap_viewer",
    );
    expect(session?.httpOnly).toBe(true);
    expect(session?.secure).toBe(true);
    expect(session?.sameSite).toBe("Strict");

    // ttyd uses the WebGL renderer; a stable xterm without reconnect UI proves
    // the authenticated WebSocket stayed connected. The Natural screen itself
    // is also exercised by the VM startup validator.
    const terminal = page.frameLocator("iframe");
    await expect(terminal.locator(".xterm")).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(12000);
    await expect(terminal.getByText("Press Enter to Reconnect")).toHaveCount(0);

    expect(
      (
        await context.request.get(`${origin}/admin/`, { maxRedirects: 0 })
      ).status(),
    ).toBe(403);
    await page
      .getByRole("button", { name: labels.signOut, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/$`));
    await page.waitForTimeout(3000);
    expect(
      (
        await context.request.get(`${origin}/terminal/`, { maxRedirects: 0 })
      ).status(),
    ).toBe(303);
  });
}

test("legacy: administrator reaches the operator terminal and the Adabas console", async ({
  page,
  context,
}) => {
  // REQ-122 REQ-124
  const labels = locales[0][1];
  await signIn(page, "pt-BR", "ADMIN", labels);
  await expect(page).toHaveURL(/\/viewer\?locale=pt-BR$/);
  await expect(
    page.getByRole("link", { name: "Console Adabas", exact: true }),
  ).toBeVisible();
  expect(
    (
      await context.request.get(`${origin}/admin/`, { maxRedirects: 0 })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: labels.signOut, exact: true }).click();
});

test("legacy: wrong credentials, role mismatch and forged sessions are denied", async ({
  page,
  request,
}) => {
  // REQ-121 REQ-122 REQ-123
  const labels = locales[1][1];
  const viewer = credentials("VIEWER");
  await page.goto(`${origin}/en/#acesso`);
  await page.getByLabel(labels.username, { exact: true }).fill(viewer.username);
  await page
    .getByLabel(labels.password, { exact: true })
    .fill("not-a-valid-credential");
  await page.getByRole("button", { name: labels.signIn, exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(labels.invalid);

  // A viewer credential must still create only a viewer session.
  const escalation = await request.post(`${origin}/auth/login`, {
    headers: { Origin: origin },
    form: {
      locale: "en",
      username: viewer.username,
      password: viewer.password,
    },
    maxRedirects: 0,
  });
  expect(escalation.status()).toBe(303);
  const viewerCookie = escalation.headers()["set-cookie"]?.split(";")[0];
  expect(viewerCookie).toBeTruthy();
  expect(
    (
      await request.get(`${origin}/admin/`, {
        headers: { Cookie: viewerCookie!, "X-Sifap-Role": "ADMIN" },
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(403);
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
  ).toBe(403);
});

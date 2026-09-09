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
    .getByLabel(labels.accessType, { exact: true })
    .selectOption(role === "ADMIN" ? labels.adminOption : labels.viewerOption);
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
  accessType: string;
  username: string;
  password: string;
  signIn: string;
  adminOption: string;
  viewerOption: string;
  signOut: string;
  invalid: string;
}

const locales: Array<[string, Labels]> = [
  [
    "pt-BR",
    {
      title: "O futuro começa",
      accessType: "Tipo de acesso",
      username: "Usuário",
      password: "Senha",
      signIn: "Entrar",
      adminOption: "Administrador — acesso completo",
      viewerOption: "Viewer — somente consulta",
      signOut: "Sair",
      invalid: "Usuário, senha ou tipo de acesso incorretos.",
    },
  ],
  [
    "en",
    {
      title: "The future begins",
      accessType: "Access type",
      username: "Username",
      password: "Password",
      signIn: "Sign in",
      adminOption: "Administrator — full access",
      viewerOption: "Viewer — read only",
      signOut: "Sign out",
      invalid: "Incorrect username, password or access type.",
    },
  ],
  [
    "es",
    {
      title: "El futuro comienza",
      accessType: "Tipo de acceso",
      username: "Usuario",
      password: "Contraseña",
      signIn: "Acceder",
      adminOption: "Administrador — acceso completo",
      viewerOption: "Viewer — solo consulta",
      signOut: "Salir",
      invalid: "Usuario, contraseña o tipo de acceso incorrectos.",
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

    // The pinned VIEWBENF query screen must actually render, not just connect.
    const screen = page.frameLocator("iframe").locator(".xterm-rows");
    await expect(screen).toBeVisible({ timeout: 30000 });
    await expect(screen).toContainText("BENEFICIARY QUERY", { timeout: 30000 });

    expect(
      (
        await context.request.get(`${origin}/admin/`, { maxRedirects: 0 })
      ).status(),
    ).toBe(403);
    await page
      .getByRole("button", { name: labels.signOut, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/$`));
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
});

test("legacy: wrong credentials, role mismatch and forged sessions are denied", async ({
  page,
  request,
}) => {
  // REQ-121 REQ-122 REQ-123
  const labels = locales[1][1];
  const viewer = credentials("VIEWER");
  await page.goto(`${origin}/en/#acesso`);
  await page
    .getByLabel(labels.accessType, { exact: true })
    .selectOption(labels.viewerOption);
  await page.getByLabel(labels.username, { exact: true }).fill(viewer.username);
  await page
    .getByLabel(labels.password, { exact: true })
    .fill("not-a-valid-credential");
  await page.getByRole("button", { name: labels.signIn, exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(labels.invalid);

  // A viewer credential must never be accepted for the administrator role.
  const escalation = await request.post(`${origin}/auth/login`, {
    headers: { Origin: origin },
    form: {
      locale: "en",
      role: "ADMIN",
      username: viewer.username,
      password: viewer.password,
    },
    maxRedirects: 0,
  });
  expect(escalation.status()).toBe(401);
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
  ).toBe(303);
});

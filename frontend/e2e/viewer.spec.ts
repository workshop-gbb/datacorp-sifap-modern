import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dictionary, locales, type Locale } from "../src/lib/i18n";

function credentials(role: "ADMIN" | "VIEWER") {
  const file = process.env.SIFAP_TEST_SECRET_FILE;
  if (file) {
    const data = JSON.parse(readFileSync(file, "utf8"));
    const username = data[`SIFAP_${role}_USERNAME`];
    const password = data[`SIFAP_${role}_PASSWORD`];
    if (typeof username !== "string" || typeof password !== "string")
      throw new Error(`Missing ${role} test credential`);
    return { username, password };
  }
  const password = process.env[`SIFAP_${role}_PASSWORD`];
  if (!password) throw new Error("Provide protected test credentials.");
  return {
    username: process.env[`SIFAP_${role}_USERNAME`] ?? role.toLowerCase(),
    password,
  };
}

async function login(
  page: Page,
  locale: Locale,
  role: "ADMIN" | "VIEWER" = "VIEWER",
) {
  const d = dictionary(locale);
  const account = credentials(role);
  await page.goto(`/${locale}/login`);
  await page.getByLabel(d.accessType, { exact: true }).selectOption(role);
  await page.getByLabel(d.username, { exact: true }).fill(account.username);
  await page.getByLabel(d.password, { exact: true }).fill(account.password);
  await page.getByRole("button", { name: d.signIn, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    d.dashboardTitle,
  );
}

for (const locale of locales) {
  test(`${locale}: landing, localization and responsive layout`, async ({
    page,
  }) => {
    // REQ-101 REQ-102 REQ-110
    const d = dictionary(locale);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        d.heroFirst,
      );
      await expect(
        page.getByRole("link", { name: d.explore, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      for (const choice of ["EN", "ES", "PT-BR"])
        await expect(
          page
            .getByRole("navigation", { name: d.language })
            .getByRole("link", { name: choice, exact: true }),
        ).toBeVisible();
    }
    await page.getByRole("link", { name: d.explore, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
  });

  test(`${locale}: authenticated viewer explores all screens and exports`, async ({
    page,
    context,
  }) => {
    // REQ-103 REQ-105 REQ-106 REQ-107 REQ-108 REQ-109 REQ-111
    const d = dictionary(locale);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page, locale);
    const session = (await context.cookies()).find(
      (cookie) => cookie.name === "sifap_session",
    );
    expect(session?.httpOnly).toBe(true);
    if (process.env.SIFAP_BASE_URL?.startsWith("https:"))
      expect(session?.secure).toBe(true);
    await expect(page.locator(".metric")).toHaveCount(4);
    await expect(
      page.getByRole("img", { name: d.paymentTrend, exact: true }),
    ).toBeVisible();
    await page.goto(`/${locale}/beneficiaries`);
    await page.getByLabel(d.search, { exact: true }).fill("0001");
    await page.getByRole("button", { name: d.apply, exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page
      .getByRole("link", { name: "Participante 001", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: d.relatedPayments }),
    ).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(6);
    await page.goto(`/${locale}/programs`);
    await expect(page.locator("tbody tr")).toHaveCount(6);
    await page.getByRole("link", { name: "Renda Cidada", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/programs/PRG-001$`), {
      timeout: 15000,
    });
    await expect(
      page.getByRole("heading", { name: d.relatedBeneficiaries }),
    ).toBeVisible();
    await page.goto(`/${locale}/payments`);
    await expect(page.locator("tbody tr")).toHaveCount(12);
    await page.getByRole("link", { name: d.next, exact: true }).click();
    await expect(page).toHaveURL(/page=1/);
    await page.goto(`/${locale}/reports?program=PRG-001`);
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: d.download, exact: true }).click();
    const file = await download;
    expect((await file.suggestedFilename()).endsWith(".csv")).toBe(true);
    expect(await file.failure()).toBeNull();
    await page.goto(`/${locale}/integrations`);
    await expect(page.locator(".integration-card")).toHaveCount(2);
    await expect(page.getByText(d.legacyScope, { exact: true })).toBeVisible();
    await page.goto(`/${locale}/dashboard`);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: d.recent })).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    const tableLabel = page.locator(".table-scroll thead .sr-only");
    await expect(tableLabel).toBeAttached();
    expect(
      await tableLabel.evaluate(
        (element) =>
          element instanceof HTMLElement &&
          element.closest(".table-scroll")?.contains(element.offsetParent),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: d.menu, exact: true }).click();
    await expect(page.locator("#workspace-navigation")).toBeVisible();
    await page.getByRole("button", { name: d.closeMenu, exact: true }).click();
    await page.getByRole("button", { name: d.signOut, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
    await page.goto(`/${locale}/dashboard`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
  });
}

test("invalid login and forged session do not grant access", async ({
  page,
  context,
}) => {
  // REQ-103 REQ-104 REQ-111
  const d = dictionary("en");
  await page.goto("/en/login");
  await page.getByLabel(d.username, { exact: true }).fill("viewer");
  await page
    .getByLabel(d.password, { exact: true })
    .fill("not-a-valid-credential");
  await page.getByRole("button", { name: d.signIn, exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: d.invalidCredentials }),
  ).toBeVisible();
  await context.addCookies([
    {
      name: "sifap_session",
      value: "forged",
      url: process.env.SIFAP_BASE_URL ?? "http://127.0.0.1:3100",
    },
  ]);
  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/en\/login\?expired=1$/);
});

test("administrator credentials grant only the configured administrator identity", async ({
  page,
  request,
}) => {
  // REQ-121 REQ-122
  const d = dictionary("en");
  await login(page, "en", "ADMIN");
  await expect(page.getByText(d.administrator, { exact: true })).toBeVisible();
  const viewer = credentials("VIEWER");
  const mismatch = await request.post(
    `${process.env.SIFAP_API_BASE ?? "http://127.0.0.1:18080"}/api/v1/auth/login`,
    {
      data: {
        username: viewer.username,
        password: viewer.password,
        role: "ADMIN",
      },
    },
  );
  expect(mismatch.status()).toBe(401);
});

test("API enforces viewer permissions and reconciles records", async ({
  request,
}) => {
  // REQ-104 REQ-105 REQ-106 REQ-108 REQ-112
  const base = process.env.SIFAP_API_BASE ?? "http://127.0.0.1:18080";
  expect((await request.get(`${base}/api/v1/payments`)).status()).toBe(401);
  const viewer = credentials("VIEWER");
  const loginResponse = await request.post(`${base}/api/v1/auth/login`, {
    data: {
      username: viewer.username,
      password: viewer.password,
      role: "VIEWER",
    },
  });
  expect(loginResponse.status()).toBe(200);
  const session = await loginResponse.json();
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = await request.fetch(`${base}/api/v1/programs`, {
      method,
      headers,
      data: {},
    });
    expect(response.status()).toBe(403);
  }
  const summary = await (
    await request.get(`${base}/api/v1/reports/summary`, { headers })
  ).json();
  const dashboard = await (
    await request.get(`${base}/api/v1/dashboard`, { headers })
  ).json();
  expect(summary.totalPayments === dashboard.totals.payments).toBe(true);
  expect(summary.paidAmount === dashboard.totals.paidAmount).toBe(true);
  const csv = await request.get(`${base}/api/v1/reports/payments.csv`, {
    headers,
  });
  expect(csv.status()).toBe(200);
  expect(
    (await csv.text()).trim().split("\r\n").length - 1 ===
      summary.totalPayments,
  ).toBe(true);
  expect(
    (
      await request.get(`${base}/api/v1/payments?size=101`, { headers })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get(`${base}/api/v1/beneficiaries/UNKNOWN`, { headers })
    ).status(),
  ).toBe(404);
  const integrations = await (
    await request.get(`${base}/api/v1/integrations`, { headers })
  ).json();
  expect(integrations.integrations.length).toBe(2);
  for (const integration of integrations.integrations) {
    expect(["CONNECTED", "UNAVAILABLE"].includes(integration.status)).toBe(
      true,
    );
    expect(Number.isNaN(Date.parse(integration.checkedAt))).toBe(false);
    if (process.env.SIFAP_REQUIRE_INTEGRATIONS === "true")
      expect(integration.status).toBe("CONNECTED");
  }
});

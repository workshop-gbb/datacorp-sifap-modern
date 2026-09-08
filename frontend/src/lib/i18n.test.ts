import { describe, it, expect } from "vitest";
import {
  dictionaries,
  locales,
  isLocale,
  money,
  month,
  date,
  label,
} from "./i18n";
import { pageLink, queryString } from "./query";

describe("viewer platform language and filters", () => {
  it("provides every label in all three locales", () => {
    // REQ-102
    const keys = Object.keys(dictionaries.en).sort();
    for (const locale of locales) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(keys);
      expect(
        Object.values(dictionaries[locale]).every((value) => value.length > 0),
      ).toBe(true);
    }
    expect(isLocale("pt-BR")).toBe(true);
    expect(isLocale("pt")).toBe(false);
  });
  it("formats amounts and dates for the selected language", () => {
    // REQ-102 REQ-105
    expect(money("1250.50", "pt-BR")).toContain("1.250,50");
    expect(money("1250.50", "en")).toContain("1,250.50");
    expect(month("2026-08", "es")).toContain("ago");
    expect(date("2026-08-31", "en")).toContain("2026");
    expect(label("pt-BR", "PAID")).toBe("Pago");
    expect(label("en", "PRG-001")).toBe("PRG-001");
  });
  it("preserves supported filters when paginating", () => {
    // REQ-106
    expect(pageLink({ q: "a b", state: "SP", unknown: "x" }, 2)).toBe(
      "?q=a+b&state=SP&page=2",
    );
    expect(
      queryString({ q: ["a", "b"], status: "PAID" }, ["q", "status"]),
    ).toBe("status=PAID");
  });
});

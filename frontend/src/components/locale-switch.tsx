"use client";
import { AppLink as Link } from "./app-link";
import { usePathname, useSearchParams } from "next/navigation";
import { dictionary, locales, type Locale } from "@/lib/i18n";
export function LocaleSwitch({ locale }: { locale: Locale }) {
  const path = usePathname();
  const search = useSearchParams();
  const remainder = path.split("/").slice(2).join("/");
  const suffix = search.toString() ? `?${search}` : "";
  return (
    <nav className="locale-switch" aria-label={dictionary(locale).language}>
      {locales.map((choice) => (
        <Link
          key={choice}
          href={`/${choice}${remainder ? `/${remainder}` : ""}${suffix}`}
          hrefLang={choice}
          aria-current={choice === locale ? "true" : undefined}
        >
          {choice === "pt-BR" ? "PT-BR" : choice.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}

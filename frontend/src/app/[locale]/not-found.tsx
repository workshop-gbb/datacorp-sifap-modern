"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { dictionary, isLocale } from "@/lib/i18n";
export default function NotFound() {
  const { locale: value } = useParams<{ locale: string }>();
  const locale = isLocale(value) ? value : "pt-BR";
  const d = dictionary(locale);
  return (
    <div className="error-state">
      <p className="eyebrow">404</p>
      <h1>{d.notFound}</h1>
      <Link href={`/${locale}/dashboard`}>{d.dashboard}</Link>
    </div>
  );
}

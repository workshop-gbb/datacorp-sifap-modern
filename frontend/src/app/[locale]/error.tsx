"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { dictionary, isLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { locale: value } = useParams<{ locale: string }>();
  const locale = isLocale(value) ? value : "pt-BR";
  const d = dictionary(locale);
  return (
    <div role="alert" className="error-state">
      <AlertCircle size={36} />
      <h1>{d.errorTitle}</h1>
      <p>{d.errorCopy}</p>
      <div>
        <Button onClick={reset}>{d.retry}</Button>
        <Link href={`/${locale}/login`}>{d.signIn}</Link>
      </div>
    </div>
  );
}

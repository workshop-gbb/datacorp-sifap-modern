import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { LocaleSwitch } from "./locale-switch";
import { dictionary, type Locale } from "@/lib/i18n";
export function PublicHeader({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  return (
    <header className="public-header container">
      <Brand locale={locale} />
      <div className="header-actions">
        <LocaleSwitch locale={locale} />
        <Link className="header-signin" href={`/${locale}/login`}>
          {d.signIn}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </header>
  );
}

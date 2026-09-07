import { AppLink as Link } from "./app-link";
import type { Locale } from "@/lib/i18n";
export function Brand({ locale }: { locale: Locale }) {
  return (
    <Link href={`/${locale}`} className="brand" aria-label="SIFAP">
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        SIFAP<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}

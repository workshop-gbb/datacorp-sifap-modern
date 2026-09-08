import { PublicHeader } from "@/components/public-header";
import { LoginForm } from "@/components/login-form";
import { dictionary, isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { ViewerButton } from "@/components/viewer-button";
export default async function Login({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary(locale);
  return (
    <>
      <a className="skip-link" href="#main">
        {d.skip}
      </a>
      <PublicHeader locale={locale} />
      <main id="main" className="container login-grid">
        <div className="login-editorial">
          <p className="eyebrow">SIFAP / {d.edition}</p>
          <h2>{d.loginAside}</h2>
          <p>{d.loginAsideCopy}</p>
          <div className="login-abstract" aria-hidden="true">
            <span />
            <span />
            <span />
            <ArrowUpRight size={88} strokeWidth={1} />
          </div>
          <p className="mono">
            <LockKeyhole size={14} />
            {d.readOnly}
          </p>
        </div>
        <div className="login-panel">
          <p className="eyebrow">{d.viewer} / 01</p>
          <h1>{d.loginTitle}</h1>
          <p>
            {process.env.SIFAP_GUEST_VIEWER_ENABLED === "true"
              ? d.directViewerCopy
              : d.loginCopy}
          </p>
          {process.env.SIFAP_GUEST_VIEWER_ENABLED === "true" ? (
            <>
              <div className="guest-login-panel">
                <ViewerButton locale={locale} label={d.enterViewer} />
                <p>{d.directViewerNote}</p>
              </div>
              <details className="credential-login">
                <summary>{d.credentialAccess}</summary>
                <LoginForm locale={locale} />
              </details>
            </>
          ) : (
            <LoginForm locale={locale} />
          )}
          <p className="muted tiny">{d.syntheticCopy}</p>
        </div>
      </main>
    </>
  );
}

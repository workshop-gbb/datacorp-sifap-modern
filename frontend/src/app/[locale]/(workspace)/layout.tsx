import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { dictionary, isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { WorkspaceNav } from "@/components/workspace-nav";
import { LocaleSwitch } from "@/components/locale-switch";
import { logout } from "../login/actions";
import { LogOut, ShieldCheck } from "lucide-react";
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary(locale);
  const user = await api<User>("/auth/me", locale);
  return (
    <div className="workspace-shell">
      <a href="#main" className="skip-link">
        {d.skip}
      </a>
      <WorkspaceNav locale={locale} />
      <div className="workspace-body">
        <header className="workspace-header">
          <span className="workspace-breadcrumb">
            SIFAP<span>/</span>
            {d.workspace}
          </span>
          <div className="workspace-header-actions">
            <LocaleSwitch locale={locale} />
            <span className="user-role">
              <ShieldCheck size={15} />
              {user.role === "ADMIN" ? d.administrator : d.viewer}
            </span>
            <form action={logout}>
              <input type="hidden" name="locale" value={locale} />
              <button
                className="icon-button"
                type="submit"
                aria-label={d.signOut}
                title={d.signOut}
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </header>
        <div className="dataset-banner">
          <span className="dataset-marker" />
          <strong>{d.synthetic}</strong>
          <span>{d.syntheticCopy}</span>
        </div>
        <main id="main" className="workspace-main">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>{d.footer}</span>
          <span className="mono">{d.snapshot}: 2026-08-31</span>
        </footer>
      </div>
    </div>
  );
}

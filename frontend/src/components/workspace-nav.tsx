"use client";
import { AppLink as Link } from "./app-link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  UsersRound,
  Layers,
  ArrowLeftRight,
  FileChartColumn,
  Plug,
  LockKeyhole,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { dictionary, type Locale } from "@/lib/i18n";
import { Brand } from "./brand";
export function WorkspaceNav({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { path: "dashboard", title: d.overview, icon: LayoutDashboard },
    { path: "beneficiaries", title: d.beneficiaries, icon: UsersRound },
    { path: "programs", title: d.programs, icon: Layers },
    { path: "payments", title: d.payments, icon: ArrowLeftRight },
    { path: "reports", title: d.reports, icon: FileChartColumn },
    { path: "integrations", title: d.integrations, icon: Plug },
  ];
  return (
    <>
      <div className="mobile-nav">
        <Brand locale={locale} />
        <button
          className="icon-button"
          type="button"
          aria-expanded={open}
          aria-controls="workspace-navigation"
          aria-label={open ? d.closeMenu : d.menu}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <aside
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        id="workspace-navigation"
      >
        <div className="sidebar-brand">
          <Brand locale={locale} />
          <span className="eyebrow">{d.edition}</span>
        </div>
        <p className="nav-heading">{d.workspace}</p>
        <nav aria-label={d.workspace}>
          {links.map(({ path, title, icon: Icon }, index) => (
            <Link
              key={path}
              href={`/${locale}/${path}`}
              onClick={() => setOpen(false)}
              aria-current={
                pathname.split("/")[2] === path ? "page" : undefined
              }
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{title}</span>
              <span className="nav-index" aria-hidden="true">
                0{index + 1}
              </span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="nav-heading">{d.resources}</p>
          <a
            className="legacy-link"
            href="https://sifap-lab-438k30.eastus2.cloudapp.azure.com/terminal/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Natural / Adabas</span>
            <ArrowUpRight size={16} />
          </a>
          <div className="viewer-notice">
            <LockKeyhole size={17} />
            <div>
              <strong>{d.readOnly}</strong>
              <p>{d.rights}</p>
            </div>
          </div>
          <span className="sidebar-version mono">SIFAP / WORKSHOP 2026</span>
        </div>
      </aside>
    </>
  );
}

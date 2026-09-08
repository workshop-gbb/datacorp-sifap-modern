import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  Layers,
  ScanLine,
  ChartNoAxesCombined,
  LockKeyhole,
  CircleCheck,
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { dictionary, isLocale } from "@/lib/i18n";
import { ViewerButton } from "@/components/viewer-button";
export default async function Landing({
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
      <section className="landing-dark">
        <PublicHeader locale={locale} />
        <main id="main" className="container hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" />
              {d.landingEyebrow}
            </p>
            <h1>
              {d.heroFirst}
              <br />
              <span>{d.heroSecond}</span>
            </h1>
            <p className="hero-description">{d.heroCopy}</p>
            <div className="hero-actions">
              {process.env.SIFAP_GUEST_VIEWER_ENABLED === "true" ? (
                <ViewerButton locale={locale} label={d.explore} />
              ) : (
                <Button asChild>
                  <Link href={`/${locale}/login`}>
                    {d.explore}
                    <ArrowUpRight size={18} />
                  </Link>
                </Button>
              )}
              <a className="text-link" href="#experience">
                {d.learn}
                <ArrowDown size={16} />
              </a>
            </div>
            <p className="hero-assurance">
              <LockKeyhole size={14} />
              {d.readOnly}
              <span>·</span>
              {d.synthetic}
            </p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="art-top">
              <span className="mono">SIFAP / 02</span>
              <span className="art-status">
                <i />
                {d.overview}
              </span>
            </div>
            <div className="art-tile tile-program">
              <Layers size={23} />
              <div>
                <small>{d.programs}</small>
                <strong>06</strong>
              </div>
              <ArrowUpRight size={16} />
            </div>
            <div className="art-center">
              <span className="art-cross">+</span>
              <span>S</span>
              <span className="art-center-dot" />
            </div>
            <div className="art-tile tile-data">
              <span className="mono">01 — 06</span>
              <div className="mini-bars">
                {[44, 62, 50, 82, 70, 92, 65, 100, 78, 90].map((v, i) => (
                  <i key={i} style={{ height: `${v}%` }} />
                ))}
              </div>
              <small>{d.techModern}</small>
            </div>
            <div className="art-bottom">
              <span className="mono">{d.threeLanguages}</span>
              <span className="art-plus">↗</span>
            </div>
          </div>
        </main>
        <div className="container hero-baseline">
          <span className="mono">01 / SIFAP MODERN</span>
          <span>{d.fixturePeriod}</span>
          <ArrowDown size={18} />
        </div>
      </section>
      <section className="container editorial-section" id="experience">
        <div className="section-heading">
          <p className="eyebrow">01 — {d.edition}</p>
          <div>
            <h2>{d.experienceTitle}</h2>
            <p>{d.experienceCopy}</p>
          </div>
        </div>
        <div className="feature-grid">
          {[
            { icon: Layers, title: d.featureOne, copy: d.featureOneCopy },
            { icon: ScanLine, title: d.featureTwo, copy: d.featureTwoCopy },
            {
              icon: ChartNoAxesCombined,
              title: d.featureThree,
              copy: d.featureThreeCopy,
            },
          ].map(({ icon: Icon, title, copy }, index) => (
            <article key={title} className="feature">
              <div className="feature-top">
                <Icon size={30} strokeWidth={1.4} />
                <span className="mono">0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
              <ArrowUpRight size={21} className="feature-arrow" />
            </article>
          ))}
        </div>
      </section>
      <section className="journey-section">
        <div className="container journey-grid">
          <div>
            <p className="eyebrow">
              02 — SIFAP / {d.legacy.split(" ").slice(-1)}
            </p>
            <h2>{d.journeyTitle}</h2>
            <p>{d.journeyCopy}</p>
            <a
              className="text-link dark-link"
              href="https://sifap-lab-438k30.eastus2.cloudapp.azure.com/terminal/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {d.legacy}
              <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="journey-diagram">
            <div className="journey-node">
              <span className="mono">01 / LEGACY</span>
              <span className="terminal-prompt">
                &gt; SIFAPPRD<span className="cursor">_</span>
              </span>
              <small>{d.techLegacy}</small>
            </div>
            <div className="journey-connector">
              <span />
              <ArrowRight size={20} />
              <span />
            </div>
            <div className="journey-node modern-node">
              <span className="mono">02 / MODERN</span>
              <span className="modern-prompt">
                SIFAP<span>↗</span>
              </span>
              <small>{d.techModern}</small>
            </div>
          </div>
        </div>
      </section>
      <section className="container closing-section">
        <div>
          <p className="eyebrow">
            <CircleCheck size={16} />
            {d.protected}
          </p>
          <h2>{d.start}</h2>
          <p>{d.startCopy}</p>
        </div>
        {process.env.SIFAP_GUEST_VIEWER_ENABLED === "true" ? (
          <ViewerButton locale={locale} />
        ) : (
          <Button asChild>
            <Link href={`/${locale}/login`}>
              {d.signIn}
              <ArrowUpRight size={18} />
            </Link>
          </Button>
        )}
      </section>
      <footer className="public-footer container">
        <Brand locale={locale} />
        <div>
          <p>{d.footer}</p>
          <small>{d.disclaimer}</small>
        </div>
        <span className="mono">2026</span>
      </footer>
    </>
  );
}

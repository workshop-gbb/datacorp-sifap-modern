import { AppLink as Link } from "@/components/app-link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownToLine,
  UsersRound,
  Layers,
  Wallet,
  Clock3,
  Database,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { dictionary, date, label, money, month, isLocale } from "@/lib/i18n";
import { queryString, type Search } from "@/lib/query";
import type {
  Dashboard,
  Page,
  Program,
  Beneficiary,
  Payment,
  Summary,
  Integrations,
} from "@/lib/types";
import {
  PageHeading,
  Filters,
  PeriodFilter,
  Metric,
  PaymentTable,
  ProgramTable,
  BeneficiaryTable,
  Pagination,
  Status,
} from "@/components/data-ui";
import { PaymentChart, ProgramChart, StateChart } from "@/components/charts";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; section: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale, section } = await params;
  if (!isLocale(locale)) notFound();
  const search = await searchParams;
  const d = dictionary(locale);
  if (
    ![
      "dashboard",
      "programs",
      "beneficiaries",
      "payments",
      "reports",
      "integrations",
    ].includes(section)
  )
    notFound();
  if (section === "dashboard") {
    const data = await api<Dashboard>(
      `/dashboard?${queryString(search, ["period"])}`,
      locale,
    );
    return (
      <>
        <PageHeading
          eyebrow={`01 / ${d.overview}`}
          title={d.dashboardTitle}
          copy={d.dashboardCopy}
        >
          <PeriodFilter locale={locale} period={data.period} />
        </PageHeading>
        <div className="metrics-grid">
          <Metric
            label={d.beneficiariesMetric}
            value={data.totals.beneficiaries.toLocaleString(locale)}
            icon={<UsersRound size={18} />}
            note={`${data.totals.coverageStates} ${d.coverageMetric.toLowerCase()}`}
          />
          <Metric
            label={d.programsMetric}
            value={String(data.totals.activePrograms).padStart(2, "0")}
            icon={<Layers size={18} />}
            note={d.readOnly}
          />
          <Metric
            label={d.paidMetric}
            value={money(data.totals.paidAmount, locale)}
            icon={<Wallet size={18} />}
            note={month(data.period, locale)}
          />
          <Metric
            label={d.pendingMetric}
            value={money(data.totals.pendingAmount, locale)}
            icon={<Clock3 size={18} />}
            note={month(data.period, locale)}
          />
        </div>
        <div className="dashboard-charts">
          <PaymentChart data={data.monthlyPayments} locale={locale} />
          <ProgramChart data={data.programDistribution} locale={locale} />
        </div>
        <section className="data-panel">
          <div className="panel-heading">
            <div>
              <h2>{d.recent}</h2>
              <p>
                {month(data.period, locale)} · {data.totals.payments}{" "}
                {d.records}
              </p>
            </div>
            <Link
              className="text-link dark-link"
              href={`/${locale}/payments?period=${data.period}`}
            >
              {d.viewAll}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <PaymentTable items={data.recentPayments} locale={locale} />
        </section>
        <div className="dashboard-bottom">
          <StateChart data={data.stateDistribution} locale={locale} />
          <aside className="source-panel">
            <Database size={28} strokeWidth={1.4} />
            <h2>{d.synthetic}</h2>
            <p>{d.syntheticCopy}</p>
            <dl>
              <dt>{d.snapshot}</dt>
              <dd>{date(data.dataset.asOf, locale)}</dd>
              <dt>{d.source}</dt>
              <dd className="mono">{data.dataset.source}</dd>
            </dl>
            <Link
              href={`/${locale}/integrations`}
              className="text-link dark-link"
            >
              {d.integrations}
              <ArrowUpRight size={16} />
            </Link>
          </aside>
        </div>
      </>
    );
  }
  if (section === "reports") {
    const qs = queryString(search, ["period", "program", "state"]);
    const data = await api<Summary>(`/reports/summary?${qs}`, locale);
    return (
      <>
        <PageHeading
          eyebrow={`05 / ${d.reports}`}
          title={d.reportsTitle}
          copy={d.reportsCopy}
        >
          <div className="report-actions">
            <PrintButton label={d.print} />
            <Button asChild>
              <a href={`/${locale}/exports/payments?${qs}`}>
                <ArrowDownToLine size={16} />
                {d.download}
              </a>
            </Button>
          </div>
        </PageHeading>
        <Filters locale={locale} section={section} search={search} />
        <p className="report-note">{d.exportNote}</p>
        <div className="metrics-grid">
          <Metric
            label={d.payments}
            value={String(data.totalPayments)}
            note={month(data.period, locale)}
          />
          <Metric label={d.paid} value={money(data.paidAmount, locale)} />
          <Metric label={d.pending} value={money(data.pendingAmount, locale)} />
          <Metric label={d.blocked} value={money(data.blockedAmount, locale)} />
        </div>
        <div className="report-grid">
          <section className="data-panel">
            <div className="panel-heading">
              <h2>{d.reportByProgram}</h2>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{d.program}</th>
                    <th>{d.payments}</th>
                    <th className="numeric">{d.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byProgram.map((p) => (
                    <tr key={p.code}>
                      <td>
                        <Link href={`/${locale}/programs/${p.code}`}>
                          {p.name}
                        </Link>
                      </td>
                      <td className="mono">{p.payments}</td>
                      <td className="numeric mono">
                        {money(p.amount, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="data-panel">
            <div className="panel-heading">
              <h2>{d.reportByState}</h2>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{d.state}</th>
                    <th>{d.payments}</th>
                    <th className="numeric">{d.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byState.map((p) => (
                    <tr key={p.state}>
                      <td>{p.state}</td>
                      <td className="mono">{p.payments}</td>
                      <td className="numeric mono">
                        {money(p.amount, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </>
    );
  }
  if (section === "integrations") {
    const data = await api<Integrations>("/integrations", locale);
    return (
      <>
        <PageHeading
          eyebrow={`06 / ${d.integrations}`}
          title={d.integrationsTitle}
          copy={d.integrationsCopy}
        />
        <div className="integration-grid">
          {data.integrations.map((integration) => (
            <article className="integration-card" key={integration.id}>
              <div className="integration-top">
                <span
                  className={`integration-logo integration-${integration.id}`}
                >
                  {integration.id === "legacy" ? ">_" : "IBGE"}
                </span>
                <Status status={integration.status} locale={locale} />
              </div>
              <h2>{integration.name}</h2>
              <p>{integration.id === "legacy" ? d.legacyScope : d.ibgeScope}</p>
              <dl>
                <dt>{d.scope}</dt>
                <dd>{label(locale, integration.scope)}</dd>
                <dt>{d.checkedAt}</dt>
                <dd>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(integration.checkedAt))}{" "}
                  UTC
                </dd>
                <dt>{d.latency}</dt>
                <dd className="mono">
                  {integration.latencyMs} ms / HTTP{" "}
                  {integration.httpStatus ?? "—"}
                </dd>
              </dl>
              <p
                className={
                  integration.status === "CONNECTED"
                    ? "integration-ok"
                    : "form-error"
                }
              >
                {label(locale, integration.messageCode)}
              </p>
              {integration.status !== "CONNECTED" && (
                <p>{d.integrationUnavailable}</p>
              )}
              {integration.records.length > 0 && (
                <details className="integration-data">
                  <summary>
                    {d.geographicData} ({integration.records.length})
                  </summary>
                  <ul>
                    {integration.records.map((r) => (
                      <li key={r.code}>
                        <strong className="mono">{r.code}</strong>
                        {r.name}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <a
                className="text-link dark-link"
                href={
                  integration.id === "legacy"
                    ? "https://sifap-lab-438k30.eastus2.cloudapp.azure.com/healthz"
                    : "https://servicodados.ibge.gov.br/api/v1/localidades/estados"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {d.source}
                <ExternalLink size={15} />
              </a>
            </article>
          ))}
        </div>
      </>
    );
  }
  const titles = {
    programs: d.programs,
    beneficiaries: d.beneficiaries,
    payments: d.payments,
  };
  const copy = {
    programs: d.programsCopy,
    beneficiaries: d.beneficiariesCopy,
    payments: d.paymentsCopy,
  };
  const key = section as keyof typeof titles;
  const allowed =
    section === "programs"
      ? ["q", "status", "page", "size"]
      : section === "beneficiaries"
        ? ["q", "program", "state", "status", "page", "size"]
        : ["q", "period", "program", "state", "status", "page", "size"];
  const path = `/${section}?${queryString(search, allowed)}`;
  if (section === "programs") {
    const data = await api<Page<Program>>(path, locale);
    return (
      <>
        <PageHeading
          eyebrow={`03 / ${d.workspace}`}
          title={titles[key]}
          copy={copy[key]}
        />
        <Filters locale={locale} section={section} search={search} />
        <section className="data-panel">
          <ProgramTable items={data.items} locale={locale} />
          <Pagination page={data} locale={locale} search={search} />
        </section>
      </>
    );
  }
  if (section === "beneficiaries") {
    const data = await api<Page<Beneficiary>>(path, locale);
    return (
      <>
        <PageHeading
          eyebrow={`02 / ${d.workspace}`}
          title={titles[key]}
          copy={copy[key]}
        />
        <Filters locale={locale} section={section} search={search} />
        <section className="data-panel">
          <BeneficiaryTable items={data.items} locale={locale} />
          <Pagination page={data} locale={locale} search={search} />
        </section>
      </>
    );
  }
  const data = await api<Page<Payment>>(path, locale);
  return (
    <>
      <PageHeading
        eyebrow={`04 / ${d.workspace}`}
        title={titles[key]}
        copy={copy[key]}
      />
      <Filters locale={locale} section={section} search={search} />
      <section className="data-panel">
        <PaymentTable items={data.items} locale={locale} />
        <Pagination page={data} locale={locale} search={search} />
      </section>
    </>
  );
}

import { AppLink as Link } from "./app-link";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  FileSearch,
  ArrowUpRight,
} from "lucide-react";
import {
  auditLabel,
  date,
  dictionary,
  label,
  legacyCodeLabel,
  money,
  month,
  programName,
  type Locale,
} from "@/lib/i18n";
import { periods, pageLink, type Search as SearchParams } from "@/lib/query";
import type {
  AuditEvent,
  Beneficiary,
  Page,
  Payment,
  Program,
} from "@/lib/types";
import { Button } from "./ui/button";

export function PageHeading({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {children}
    </div>
  );
}
export function Status({
  status,
  locale,
  kind = "beneficiary",
}: {
  status: string;
  locale: Locale;
  kind?: "program" | "beneficiary" | "payment" | "integration";
}) {
  const text =
    kind === "integration"
      ? label(locale, status)
      : legacyCodeLabel(
          locale,
          kind === "program" ? "program-status" : kind,
          status,
        );
  return (
    <span
      className={`status status-${kind}-${status.toLowerCase()}`}
      title={status}
    >
      <span />
      {text}
    </span>
  );
}
export function Metric({
  label: title,
  value,
  icon,
  note,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  note?: string;
}) {
  return (
    <article className="metric">
      <div>
        <span>{title}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}
export function PeriodFilter({
  locale,
  period,
}: {
  locale: Locale;
  period: string;
}) {
  const d = dictionary(locale);
  return (
    <form className="period-filter">
      <label htmlFor="period">{d.period}</label>
      <div>
        <select id="period" name="period" defaultValue={period}>
          {periods.map((p) => (
            <option key={p} value={p}>
              {month(p, locale)}
            </option>
          ))}
        </select>
        <Button variant="secondary" type="submit">
          {d.apply}
        </Button>
      </div>
    </form>
  );
}
export function Filters({
  locale,
  section,
  search,
}: {
  locale: Locale;
  section: string;
  search: SearchParams;
}) {
  const d = dictionary(locale);
  const value = (key: string, fallback = "") =>
    typeof search[key] === "string" ? search[key] : fallback;
  const report = section === "reports";
  const payment = section === "payments";
  const programs = section === "programs";
  const audits = section === "audits";
  const statuses = payment
    ? ["C", "D", "E", "G", "P", "R"]
    : programs
      ? ["A"]
      : ["A", "S", "C", "I", "D"];
  return (
    <form className="filter-bar">
      {!report && (
        <div className="filter-search">
          <label htmlFor="q">{d.search}</label>
          <div>
            <Search size={16} />
            <input
              id="q"
              name="q"
              maxLength={80}
              pattern={String.raw`(?!.*(?:^|\D)(?:\d[.\-\s]*){11}(?:$|\D)).*`}
              title={d.identifierSearchBlocked}
              placeholder={d.searchPlaceholder}
              defaultValue={value("q")}
            />
          </div>
        </div>
      )}
      {(payment || report) && (
        <div>
          <label htmlFor="filter-period">{d.period}</label>
          <select
            id="filter-period"
            name="period"
            defaultValue={value("period", "2018-01")}
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {month(p, locale)}
              </option>
            ))}
          </select>
        </div>
      )}
      {!programs && !audits && (
        <>
          <div>
            <label htmlFor="program">{d.program}</label>
            <select id="program" name="program" defaultValue={value("program")}>
              <option value="">{d.all}</option>
              {["PBF1", "BPC1", "PETI", "AUX1", "GASF", "IDOS"].map(
                (code) => (
                  <option key={code} value={code}>
                    {programName(locale, code)}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label htmlFor="state">{d.state}</label>
            <select id="state" name="state" defaultValue={value("state")}>
              <option value="">{d.all}</option>
              {[
                "AC",
                "AM",
                "BA",
                "CE",
                "DF",
                "GO",
                "MG",
                "PE",
                "PR",
                "RJ",
                "RS",
                "SC",
                "SP",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </>
      )}
      {!report && !audits && (
        <div>
          <label htmlFor="status">{d.status}</label>
          <select id="status" name="status" defaultValue={value("status")}>
            <option value="">{d.all}</option>
            {statuses.map((s) => (
              <option value={s} key={s}>
                {legacyCodeLabel(
                  locale,
                  payment
                    ? "payment"
                    : programs
                      ? "program-status"
                      : "beneficiary",
                  s,
                )}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button variant="secondary" type="submit">
        {d.apply}
      </Button>
      <Link className="clear-link" href={`/${locale}/${section}`}>
        {d.clear}
      </Link>
    </form>
  );
}
export function Empty({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  return (
    <div className="empty-state">
      <FileSearch size={36} strokeWidth={1.2} />
      <h3>{d.empty}</h3>
      <p>{d.emptyHint}</p>
    </div>
  );
}
export function Pagination({
  page,
  locale,
  search,
}: {
  page: Pick<Page<unknown>, "total" | "page" | "size">;
  locale: Locale;
  search: SearchParams;
}) {
  const d = dictionary(locale);
  return (
    <div className="pagination">
      <span>
        {page.total.toLocaleString(locale)} {d.records}{" "}
        <span className="muted">
          / {d.page} {page.page + 1} {d.of}{" "}
          {Math.max(1, Math.ceil(page.total / page.size))}
        </span>
      </span>
      <nav aria-label={d.page}>
        {page.page > 0 ? (
          <Link href={pageLink(search, page.page - 1)}>
            <ArrowLeft size={15} />
            {d.previous}
          </Link>
        ) : (
          <span aria-disabled="true">
            <ArrowLeft size={15} />
            {d.previous}
          </span>
        )}
        {(page.page + 1) * page.size < page.total ? (
          <Link href={pageLink(search, page.page + 1)}>
            {d.next}
            <ArrowRight size={15} />
          </Link>
        ) : (
          <span aria-disabled="true">
            {d.next}
            <ArrowRight size={15} />
          </span>
        )}
      </nav>
    </div>
  );
}
export function PaymentTable({
  items,
  locale,
}: {
  items: Payment[];
  locale: Locale;
}) {
  const d = dictionary(locale);
  if (!items.length) return <Empty locale={locale} />;
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={d.payments}
    >
      <table>
        <thead>
          <tr>
            <th>{d.reference}</th>
            <th>{d.participant}</th>
            <th>{d.program}</th>
            <th>{d.period}</th>
            <th className="numeric">{d.grossAmount}</th>
            <th className="numeric">{d.discountAmount}</th>
            <th className="numeric">{d.netAmount}</th>
            <th>{d.status}</th>
            <th>{d.paymentType}</th>
            <th>
              <span className="sr-only">{d.detail}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td className="mono">
                <Link href={`/${locale}/payments/${p.id}`}>{p.id}</Link>
              </td>
              <td>
                <Link href={`/${locale}/beneficiaries/${p.beneficiaryId}`}>
                  {p.beneficiaryName}
                </Link>
                <small className="cell-subtext">{p.state}</small>
              </td>
              <td>{programName(locale, p.programCode, p.programName)}</td>
              <td>{month(p.period, locale)}</td>
              <td className="numeric mono">{money(p.grossAmount, locale)}</td>
              <td className="numeric mono">
                {money(p.discountAmount, locale)}
              </td>
              <td className="numeric mono">{money(p.amount, locale)}</td>
              <td>
                <Status status={p.status} locale={locale} kind="payment" />
              </td>
              <td className="mono">
                {legacyCodeLabel(locale, "payment-type", p.type)}
              </td>
              <td>
                <Link
                  className="table-arrow"
                  href={`/${locale}/payments/${p.id}`}
                  aria-label={`${d.detail}: ${p.id}`}
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function BeneficiaryTable({
  items,
  locale,
}: {
  items: Beneficiary[];
  locale: Locale;
}) {
  const d = dictionary(locale);
  if (!items.length) return <Empty locale={locale} />;
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={d.beneficiaries}
    >
      <table>
        <thead>
          <tr>
            <th>{d.participant}</th>
            <th>{d.document}</th>
            <th>{d.program}</th>
            <th>{d.city}</th>
            <th>{d.status}</th>
            <th>{d.enrolled}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/${locale}/beneficiaries/${p.id}`}>{p.name}</Link>
                <small className="cell-subtext mono">{p.id}</small>
              </td>
              <td className="mono">{p.documentMasked}</td>
              <td>
                <Link href={`/${locale}/programs/${p.programCode}`}>
                  {programName(locale, p.programCode, p.programName)}
                </Link>
              </td>
              <td>
                {p.city}
                <small className="cell-subtext">{p.state}</small>
              </td>
              <td>
                <Status status={p.status} locale={locale} kind="beneficiary" />
              </td>
              <td>{date(p.enrolledAt, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ProgramTable({
  items,
  locale,
}: {
  items: Program[];
  locale: Locale;
}) {
  const d = dictionary(locale);
  if (!items.length) return <Empty locale={locale} />;
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={d.programs}
    >
      <table>
        <thead>
          <tr>
            <th>{d.program}</th>
            <th>{d.type}</th>
            <th>{d.beneficiaries}</th>
            <th className="numeric">{d.allAmounts}</th>
            <th>{d.status}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.code}>
              <td>
                <Link href={`/${locale}/programs/${p.code}`}>
                  {programName(locale, p.code, p.name)}
                </Link>
                <small className="cell-subtext mono">{p.code}</small>
              </td>
              <td>{legacyCodeLabel(locale, "program-type", p.type)}</td>
              <td className="mono">{p.beneficiaryCount}</td>
              <td className="numeric mono">{money(p.monthlyAmount, locale)}</td>
              <td>
                <Status status={p.status} locale={locale} kind="program" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditTable({
  items,
  locale,
}: {
  items: AuditEvent[];
  locale: Locale;
}) {
  const d = dictionary(locale);
  if (!items.length) return <Empty locale={locale} />;
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={d.audits}
    >
      <table>
        <thead>
          <tr>
            <th>{d.reference}</th>
            <th>{d.auditDate}</th>
            <th>{d.auditModule}</th>
            <th>{d.auditAction}</th>
            <th>{d.auditEntity}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((event) => (
            <tr key={event.id}>
              <td className="mono">{event.id}</td>
              <td>{date(event.date, locale)}</td>
              <td className="mono">{event.module}</td>
              <td>
                <span className="mono">{event.action}</span>
                <small className="cell-subtext">
                  {auditLabel(locale, "action", event.action)}
                </small>
              </td>
              <td>
                <span className="mono">{event.entity}</span>
                <small className="cell-subtext">
                  {auditLabel(locale, "entity", event.entity)}
                </small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

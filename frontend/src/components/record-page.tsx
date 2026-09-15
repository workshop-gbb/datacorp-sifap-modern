import { AppLink as Link } from "@/components/app-link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import {
  dictionary,
  date,
  legacyCodeLabel,
  money,
  month,
  isLocale,
  programName,
} from "@/lib/i18n";
import type { Beneficiary, Program, Payment } from "@/lib/types";
import {
  BeneficiaryTable,
  PaymentTable,
  PageHeading,
  Status,
} from "@/components/data-ui";
export default async function RecordPage({
  params,
}: {
  params: Promise<{ locale: string; section: string; id: string }>;
}) {
  const { locale, section, id } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary(locale);
  if (
    !["programs", "beneficiaries", "payments"].includes(section) ||
    !/^[A-Z0-9-]{1,32}$/.test(id)
  )
    notFound();
  const back = (
    <Link
      className="text-link dark-link back-link"
      href={`/${locale}/${section}`}
    >
      <ArrowLeft size={16} />
      {d.back}
    </Link>
  );
  if (section === "beneficiaries") {
    const data = await api<{ beneficiary: Beneficiary; payments: Payment[] }>(
      `/beneficiaries/${id}`,
      locale,
    );
    const p = data.beneficiary;
    return (
      <>
        {back}
        <PageHeading eyebrow={p.id} title={p.name} copy={d.detail}>
          <Status status={p.status} locale={locale} kind="beneficiary" />
        </PageHeading>
        <dl className="detail-grid">
          <div>
            <dt>{d.document}</dt>
            <dd className="mono">{p.documentMasked}</dd>
          </div>
          <div>
            <dt>{d.nis}</dt>
            <dd className="mono">{p.nisMasked}</dd>
          </div>
          <div>
            <dt>{d.birthDate}</dt>
            <dd>{date(p.birthDate, locale)}</dd>
          </div>
          <div>
            <dt>{d.program}</dt>
            <dd>
              <Link href={`/${locale}/programs/${p.programCode}`}>
                {programName(locale, p.programCode, p.programName)}
              </Link>
            </dd>
          </div>
          <div>
            <dt>{d.city}</dt>
            <dd>
              {p.city} / {p.state}
            </dd>
          </div>
          <div>
            <dt>{d.region}</dt>
            <dd className="mono">{p.region}</dd>
          </div>
          <div>
            <dt>{d.enrolled}</dt>
            <dd>{date(p.enrolledAt, locale)}</dd>
          </div>
          <div>
            <dt>{d.dependents}</dt>
            <dd>{p.dependents}</dd>
          </div>
          <div>
            <dt>{d.familyIncome}</dt>
            <dd>{money(p.familyIncome, locale)}</dd>
          </div>
        </dl>
        <section className="data-panel">
          <div className="panel-heading">
            <h2>{d.relatedPayments}</h2>
          </div>
          <PaymentTable items={data.payments} locale={locale} />
        </section>
      </>
    );
  }
  if (section === "programs") {
    const data = await api<{ program: Program; beneficiaries: Beneficiary[] }>(
      `/programs/${id}`,
      locale,
    );
    const p = data.program;
    return (
      <>
        {back}
        <PageHeading
          eyebrow={p.code}
          title={programName(locale, p.code, p.name)}
          copy={d.detail}
        >
          <Status status={p.status} locale={locale} kind="program" />
        </PageHeading>
        <dl className="detail-grid">
          <div>
            <dt>{d.type}</dt>
            <dd>{legacyCodeLabel(locale, "program-type", p.type)}</dd>
          </div>
          <div>
            <dt>{d.beneficiaries}</dt>
            <dd>{p.beneficiaryCount}</dd>
          </div>
          <div>
            <dt>{d.allAmounts}</dt>
            <dd>{money(p.monthlyAmount, locale)}</dd>
          </div>
          <div>
            <dt>{d.period}</dt>
            <dd>{month("2018-01", locale)}</dd>
          </div>
        </dl>
        <section className="data-panel">
          <div className="panel-heading">
            <h2>{d.relatedBeneficiaries}</h2>
          </div>
          <BeneficiaryTable items={data.beneficiaries} locale={locale} />
        </section>
      </>
    );
  }
  const p = await api<Payment>(`/payments/${id}`, locale);
  return (
    <>
      {back}
      <PageHeading eyebrow={p.id} title={d.payments} copy={d.detail}>
        <Status status={p.status} locale={locale} kind="payment" />
      </PageHeading>
      <dl className="detail-grid">
        <div>
          <dt>{d.participant}</dt>
          <dd>
            <Link href={`/${locale}/beneficiaries/${p.beneficiaryId}`}>
              {p.beneficiaryName}
            </Link>
          </dd>
        </div>
        <div>
          <dt>{d.program}</dt>
          <dd>
            <Link href={`/${locale}/programs/${p.programCode}`}>
              {programName(locale, p.programCode, p.programName)}
            </Link>
          </dd>
        </div>
        <div>
          <dt>{d.grossAmount}</dt>
          <dd>{money(p.grossAmount, locale)}</dd>
        </div>
        <div>
          <dt>{d.discountAmount}</dt>
          <dd>{money(p.discountAmount, locale)}</dd>
        </div>
        <div>
          <dt>{d.netAmount}</dt>
          <dd>{money(p.amount, locale)}</dd>
        </div>
        <div>
          <dt>{d.period}</dt>
          <dd>{month(p.period, locale)}</dd>
        </div>
        <div>
          <dt>{d.state}</dt>
          <dd>{p.state}</dd>
        </div>
        <div>
          <dt>{d.paymentType}</dt>
          <dd>{legacyCodeLabel(locale, "payment-type", p.type)}</dd>
        </div>
      </dl>
    </>
  );
}

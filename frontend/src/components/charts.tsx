import { dictionary, money, month, type Locale } from "@/lib/i18n";
import type { Dashboard } from "@/lib/types";
const colors = [
  "#00689e",
  "#296b14",
  "#735a00",
  "#7652a0",
  "#985731",
  "#424a52",
];
export function PaymentChart({
  data,
  locale,
}: {
  data: Dashboard["monthlyPayments"];
  locale: Locale;
}) {
  const d = dictionary(locale);
  const maximum = Math.max(
    1,
    ...data.map((p) => Number(p.paid) + Number(p.pending)),
  );
  const x = (i: number) => 60 + i * 105;
  const y = (amount: string) => 200 - (Number(amount) / maximum) * 154;
  const points = data.map((p, i) => `${x(i)},${y(p.paid)}`).join(" ");
  return (
    <div className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>{d.paymentTrend}</h2>
          <p>{d.paymentTrendCopy}</p>
        </div>
        <span className="chart-unit mono">BRL</span>
      </div>
      <svg
        className="trend-chart"
        viewBox="0 0 640 250"
        role="img"
        aria-label={d.paymentTrend}
      >
        <title>{d.paymentTrend}</title>
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00689e" stopOpacity=".14" />
            <stop offset="100%" stopColor="#00689e" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1="54"
              x2="604"
              y1={200 - f * 154}
              y2={200 - f * 154}
              stroke="#e6e6df"
              strokeDasharray="3 5"
            />
            <text x="42" y={204 - f * 154} textAnchor="end">
              {Math.round((maximum * f) / 1000)}k
            </text>
          </g>
        ))}
        <polygon
          points={`60,200 ${points} ${x(data.length - 1)},200`}
          fill="url(#chart-fill)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#00689e"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {data.map((p, i) => (
          <g key={p.month}>
            <circle
              cx={x(i)}
              cy={y(p.paid)}
              r="4"
              fill="#fff"
              stroke="#00689e"
              strokeWidth="2"
            />
            <text x={x(i)} y="233" textAnchor="middle">
              {month(p.month, locale)}
            </text>
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        <span>
          <i style={{ background: colors[0] }} />
          {d.paid}
        </span>
        <span className="muted">{d.synthetic}</span>
      </div>
      <details className="chart-alternative">
        <summary>{d.dataTable}</summary>
        <table>
          <thead>
            <tr>
              <th>{d.period}</th>
              <th>{d.paid}</th>
              <th>{d.pending}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.month}>
                <td>{month(p.month, locale)}</td>
                <td>{money(p.paid, locale)}</td>
                <td>{money(p.pending, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
export function ProgramChart({
  data,
  locale,
}: {
  data: Dashboard["programDistribution"];
  locale: Locale;
}) {
  const d = dictionary(locale);
  const total = data.reduce((sum, p) => sum + p.beneficiaries, 0);
  let offset = 0;
  return (
    <div className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>{d.distribution}</h2>
          <p>{d.distributionCopy}</p>
        </div>
      </div>
      <div className="donut-wrap">
        <svg
          viewBox="0 0 200 200"
          className="donut-chart"
          role="img"
          aria-label={d.distribution}
        >
          <title>{d.distribution}</title>
          {data.map((p, i) => {
            const length = total ? (p.beneficiaries / total) * 100 : 0;
            const current = offset;
            offset += length;
            return (
              <circle
                key={p.code}
                cx="100"
                cy="100"
                r="72"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="19"
                pathLength="100"
                strokeDasharray={`${Math.max(0, length - 0.8)} ${100 - length + 0.8}`}
                strokeDashoffset={-current}
                transform="rotate(-90 100 100)"
              />
            );
          })}
          <text x="100" y="101" textAnchor="middle" className="donut-number">
            {total}
          </text>
          <text x="100" y="123" textAnchor="middle" className="donut-label">
            {d.beneficiaries}
          </text>
        </svg>
      </div>
      <ul className="program-legend">
        {data.map((p, i) => (
          <li key={p.code}>
            <span>
              <i style={{ background: colors[i % colors.length] }} />
              {p.name}
            </span>
            <strong className="mono">{p.beneficiaries}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
export function StateChart({
  data,
  locale,
}: {
  data: Dashboard["stateDistribution"];
  locale: Locale;
}) {
  const d = dictionary(locale);
  const max = Math.max(1, ...data.map((p) => p.beneficiaries));
  return (
    <div className="chart-panel">
      <div className="panel-heading">
        <div>
          <h2>{d.byState}</h2>
          <p>{d.byStateCopy}</p>
        </div>
      </div>
      <ul className="state-bars">
        {data.map((p) => (
          <li key={p.state}>
            <span className="mono">{p.state}</span>
            <span className="state-track" aria-hidden="true">
              <i style={{ width: `${(p.beneficiaries / max) * 100}%` }} />
            </span>
            <strong className="mono">{p.beneficiaries}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

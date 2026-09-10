export interface User {
  id: string;
  displayName: string;
  role: "ADMIN" | "VIEWER";
}
export interface Dataset {
  id: string;
  synthetic: true;
  asOf: string;
  source: string;
}
export interface Program {
  code: string;
  name: string;
  type: string;
  status: string;
  beneficiaryCount: number;
  monthlyAmount: string;
}
export interface Beneficiary {
  id: string;
  name: string;
  documentMasked: string;
  nisMasked: string;
  birthDate: string;
  programCode: string;
  programName: string;
  state: string;
  city: string;
  region: string;
  status: string;
  enrolledAt: string;
  dependents: number;
  familyIncome: string;
}
export interface Payment {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  programCode: string;
  programName: string;
  state: string;
  period: string;
  grossAmount: string;
  discountAmount: string;
  amount: string;
  status: string;
  type: string;
  paidAt: string | null;
}
export interface AuditEvent {
  id: string;
  date: string;
  module: string;
  action: string;
  entity: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
export interface Dashboard {
  dataset: Dataset;
  period: string;
  availablePeriods: string[];
  totals: {
    beneficiaries: number;
    activePrograms: number;
    payments: number;
    grossAmount: string;
    discountAmount: string;
    netAmount: string;
    coverageStates: number;
  };
  monthlyPayments: {
    month: string;
    gross: string;
    discount: string;
    net: string;
  }[];
  programDistribution: {
    code: string;
    name: string;
    beneficiaries: number;
    amount: string;
  }[];
  stateDistribution: { state: string; beneficiaries: number; amount: string }[];
  recentPayments: Payment[];
  recentActivity: AuditEvent[];
}
export interface Summary {
  dataset: Dataset;
  period: string;
  totalPayments: number;
  grossAmount: string;
  discountAmount: string;
  netAmount: string;
  byProgram: { code: string; name: string; payments: number; amount: string }[];
  byState: { state: string; payments: number; amount: string }[];
}
export interface Integrations {
  checkedAt: string;
  integrations: {
    id: string;
    name: string;
    kind: string;
    status: string;
    checkedAt: string;
    latencyMs: number;
    httpStatus: number | null;
    scope: string;
    messageCode: string;
    records: { code: string; name: string }[];
  }[];
}

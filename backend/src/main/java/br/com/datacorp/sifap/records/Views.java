package br.com.datacorp.sifap.records;

import java.time.LocalDate;
import java.util.List;

final class Views {
    private Views() {}
    record Page<T>(List<T> items, int total, int page, int size) {}
    record Dataset(String id, boolean synthetic, LocalDate asOf, String source) {}
    record ProgramView(String code, String name, String type, String status,
                       long beneficiaryCount, String monthlyAmount) {}
    record BeneficiaryView(String id, String name, String documentMasked, String programCode,
                           String programName, String state, String city, String status, LocalDate enrolledAt) {}
    record PaymentView(String id, String beneficiaryId, String beneficiaryName,
                       String programCode, String programName, String state, String period,
                       String amount, String status, LocalDate paidAt) {}
    record ProgramDetail(ProgramView program, List<BeneficiaryView> beneficiaries) {}
    record BeneficiaryDetail(BeneficiaryView beneficiary, List<PaymentView> payments) {}
    record Totals(long beneficiaries, long activePrograms, long payments, String paidAmount,
                  String pendingAmount, long coverageStates) {}
    record Monthly(String month, String paid, String pending) {}
    record ProgramDistribution(String code, String name, long beneficiaries, String amount) {}
    record StateDistribution(String state, long beneficiaries, String amount) {}
    record Activity(String id, String occurredAt, String action, String resourceType, String resourceId) {}
    record Dashboard(Dataset dataset, String period, List<String> availablePeriods, Totals totals,
                     List<Monthly> monthlyPayments, List<ProgramDistribution> programDistribution,
                     List<StateDistribution> stateDistribution, List<PaymentView> recentPayments,
                     List<Activity> recentActivity) {}
    record ProgramReport(String code, String name, long payments, String amount) {}
    record StateReport(String state, long payments, String amount) {}
    record Summary(Dataset dataset, String period, long totalPayments, String paidAmount,
                   String pendingAmount, String blockedAmount, List<ProgramReport> byProgram,
                   List<StateReport> byState) {}
}

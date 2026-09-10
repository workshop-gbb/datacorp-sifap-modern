package br.com.datacorp.sifap.records;

import java.time.LocalDate;
import java.util.List;

final class Views {
    private Views() {}
    record Page<T>(List<T> items, int total, int page, int size) {}
    record Dataset(String id, boolean synthetic, LocalDate asOf, String source) {}
    // REQ-127 REQ-130: DTOs preserve the columns and legacy codes exposed by the active views.
    record ProgramView(String code, String name, String type, String status,
                       long beneficiaryCount, String monthlyAmount) {}
    record BeneficiaryView(String id, String name, String documentMasked, String programCode,
                           String programName, String nisMasked, LocalDate birthDate, String state,
                           String city, String region, String status, LocalDate enrolledAt,
                           int dependents, String familyIncome) {}
    record PaymentView(String id, String beneficiaryId, String beneficiaryName,
                       String programCode, String programName, String state, String period,
                       String grossAmount, String discountAmount, String amount, String status,
                       String type, LocalDate paidAt) {}
    record AuditEventView(String id, LocalDate date, String module, String action, String entity) {}
    record ProgramDetail(ProgramView program, List<BeneficiaryView> beneficiaries) {}
    record BeneficiaryDetail(BeneficiaryView beneficiary, List<PaymentView> payments) {}
    // REQ-130 REQ-131: financial views aggregate source columns without interpreting status codes.
    record Totals(long beneficiaries, long activePrograms, long payments, String grossAmount,
                  String discountAmount, String netAmount, long coverageStates) {}
    record Monthly(String month, String gross, String discount, String net) {}
    record ProgramDistribution(String code, String name, long beneficiaries, String amount) {}
    record StateDistribution(String state, long beneficiaries, String amount) {}
    record Dashboard(Dataset dataset, String period, List<String> availablePeriods, Totals totals,
                     List<Monthly> monthlyPayments, List<ProgramDistribution> programDistribution,
                     List<StateDistribution> stateDistribution, List<PaymentView> recentPayments,
                     List<AuditEventView> recentActivity) {}
    record ProgramReport(String code, String name, long payments, String amount) {}
    record StateReport(String state, long payments, String amount) {}
    record Summary(Dataset dataset, String period, long totalPayments, String grossAmount,
                   String discountAmount, String netAmount, List<ProgramReport> byProgram,
                   List<StateReport> byState) {}
}

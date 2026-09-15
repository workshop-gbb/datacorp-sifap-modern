package br.com.datacorp.sifap.records;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static br.com.datacorp.sifap.records.Views.*;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
class RecordsService {
    private static final Dataset DATASET = new Dataset(
        "legacy-2018-03-14",
        true,
        LocalDate.of(2018, 3, 14),
        "workshop-gbb/datacorp-sifap-legacy@b87992324dda18bdfc86e6507c3f99b86b99e35d");

    private final ProgramRepository programs;
    private final BeneficiaryRepository beneficiaries;
    private final PaymentRepository payments;
    private final AuditEventRepository auditEvents;

    RecordsService(ProgramRepository programs, BeneficiaryRepository beneficiaries,
            PaymentRepository payments, AuditEventRepository auditEvents) {
        this.programs = programs;
        this.beneficiaries = beneficiaries;
        this.payments = payments;
        this.auditEvents = auditEvents;
    }

    Page<ProgramView> programs(Query query) {
        var people = beneficiaries.findAll();
        var month = payments.findByPeriodOrderByIdAsc(query.period());
        var peopleById = index(people, beneficiary -> beneficiary.id);
        var rows = programs.findAll().stream()
            .sorted(Comparator.comparing(program -> program.code))
            .filter(program -> matches(program.status, query.status())
                && contains(program.code + " " + program.name, query.q()))
            .map(program -> programView(program, people, month, peopleById))
            .toList();
        return page(rows, query);
    }

    ProgramDetail program(String code) {
        var program = programs.findById(code).orElseThrow(RecordsService::notFound);
        var people = beneficiaries.findAll();
        var members = people.stream()
            .filter(beneficiary -> beneficiary.programCode.equals(code))
            .sorted(Comparator.comparing(beneficiary -> beneficiary.id))
            .map(beneficiary -> beneficiaryView(beneficiary, program.name))
            .toList();
        return new ProgramDetail(
            programView(
                program,
                people,
                payments.findByPeriodOrderByIdAsc("2018-01"),
                index(people, beneficiary -> beneficiary.id)),
            members);
    }

    Page<BeneficiaryView> beneficiaries(Query query) {
        var catalog = index(programs.findAll(), program -> program.code);
        var rows = beneficiaries.findAll().stream()
            .sorted(Comparator.comparing(beneficiary -> beneficiary.id))
            .filter(beneficiary -> matches(beneficiary.programCode, query.program())
                && matches(beneficiary.state, query.state())
                && matches(beneficiary.status, query.status())
                && contains(beneficiary.name + " " + beneficiary.id + " " + beneficiary.city, query.q()))
            .map(beneficiary -> beneficiaryView(beneficiary, catalog.get(beneficiary.programCode).name))
            .toList();
        return page(rows, query);
    }

    BeneficiaryDetail beneficiary(String id) {
        var beneficiary = beneficiaries.findById(id).orElseThrow(RecordsService::notFound);
        var program = programs.findById(beneficiary.programCode).orElseThrow(RecordsService::notFound);
        var history = payments.findByBeneficiaryIdOrderByPeriodDesc(id).stream()
            .map(payment -> paymentView(payment, beneficiary, program))
            .toList();
        return new BeneficiaryDetail(beneficiaryView(beneficiary, program.name), history);
    }

    Page<PaymentView> payments(Query query) {
        return page(paymentRows(query), query);
    }

    PaymentView payment(String id) {
        var payment = payments.findById(id).orElseThrow(RecordsService::notFound);
        var beneficiary = beneficiaries.findById(payment.beneficiaryId).orElseThrow(RecordsService::notFound);
        var program = programs.findById(beneficiary.programCode).orElseThrow(RecordsService::notFound);
        return paymentView(payment, beneficiary, program);
    }

    List<PaymentView> paymentRows(Query query) {
        var people = index(beneficiaries.findAll(), beneficiary -> beneficiary.id);
        var catalog = index(programs.findAll(), program -> program.code);
        return payments.findByPeriodOrderByIdAsc(query.period()).stream()
            .map(payment -> {
                var beneficiary = people.get(payment.beneficiaryId);
                return paymentView(payment, beneficiary, catalog.get(beneficiary.programCode));
            })
            .filter(payment -> matches(payment.programCode(), query.program())
                && matches(payment.state(), query.state())
                && matches(payment.status(), query.status())
                && contains(payment.id() + " " + payment.beneficiaryName() + " " + payment.programName(), query.q()))
            .toList();
    }

    Page<AuditEventView> auditEvents(Query query) {
        var rows = auditEvents.findAll().stream()
            .sorted(Comparator.comparing((AuditEvent event) -> event.eventDate)
                .thenComparing(event -> event.id).reversed())
            .filter(event -> contains(
                event.id + " " + event.module + " " + event.action + " " + event.entity, query.q()))
            .map(RecordsService::auditEventView)
            .toList();
        return page(rows, query);
    }

    // REQ-127 REQ-131: dashboard values come only from active legacy views.
    Dashboard dashboard(String period) {
        var query = Query.from(Map.of("period", period), Set.of("period"), Set.of());
        var rows = paymentRows(query);
        var people = beneficiaries.findAll();
        var catalog = programs.findAll().stream()
            .sorted(Comparator.comparing(program -> program.code))
            .toList();
        var history = payments.findAll();
        var totals = new Totals(
            people.size(),
            catalog.stream().filter(program -> program.status.equals("A")).count(),
            rows.size(),
            sum(rows, PaymentView::grossAmount),
            sum(rows, PaymentView::discountAmount),
            sum(rows, PaymentView::amount),
            people.stream().map(beneficiary -> beneficiary.state).distinct().count());
        var monthly = Query.PERIODS.stream()
            .map(month -> {
                var monthPayments = history.stream().filter(payment -> payment.period.equals(month)).toList();
                return new Monthly(
                    month,
                    sumPayments(monthPayments, payment -> payment.grossAmount),
                    sumPayments(monthPayments, payment -> payment.discountAmount),
                    sumPayments(monthPayments, payment -> payment.amount));
            })
            .toList();
        return new Dashboard(
            DATASET,
            period,
            Query.PERIODS,
            totals,
            monthly,
            catalog.stream().map(program -> {
                var programRows = rows.stream()
                    .filter(payment -> payment.programCode().equals(program.code)).toList();
                return new ProgramDistribution(
                    program.code,
                    program.name,
                    people.stream().filter(beneficiary -> beneficiary.programCode.equals(program.code)).count(),
                    sum(programRows, PaymentView::amount));
            }).toList(),
            people.stream().map(beneficiary -> beneficiary.state).distinct().sorted().map(state -> {
                var stateRows = rows.stream().filter(payment -> payment.state().equals(state)).toList();
                return new StateDistribution(
                    state,
                    people.stream().filter(beneficiary -> beneficiary.state.equals(state)).count(),
                    sum(stateRows, PaymentView::amount));
            }).toList(),
            rows.stream().sorted(Comparator.comparing(PaymentView::id).reversed()).limit(6).toList(),
            auditEvents.findTop6ByOrderByEventDateDescIdDesc().stream()
                .map(RecordsService::auditEventView).toList());
    }

    Summary summary(Query query) {
        var rows = paymentRows(query);
        return new Summary(
            DATASET,
            query.period(),
            rows.size(),
            sum(rows, PaymentView::grossAmount),
            sum(rows, PaymentView::discountAmount),
            sum(rows, PaymentView::amount),
            rows.stream().map(PaymentView::programCode).distinct().sorted().map(code -> {
                var group = rows.stream().filter(payment -> payment.programCode().equals(code)).toList();
                return new ProgramReport(
                    code,
                    group.getFirst().programName(),
                    group.size(),
                    sum(group, PaymentView::amount));
            }).toList(),
            rows.stream().map(PaymentView::state).distinct().sorted().map(state -> {
                var group = rows.stream().filter(payment -> payment.state().equals(state)).toList();
                return new StateReport(
                    state,
                    group.size(),
                    sum(group, PaymentView::amount));
            }).toList());
    }

    private static String sum(List<PaymentView> rows, Function<PaymentView, String> amount) {
        return rows.stream().map(amount).map(BigDecimal::new)
            .reduce(BigDecimal.ZERO, BigDecimal::add).toPlainString();
    }

    private static String sumPayments(List<Payment> rows, Function<Payment, BigDecimal> amount) {
        return rows.stream().map(amount).reduce(BigDecimal.ZERO, BigDecimal::add).toPlainString();
    }

    private static ProgramView programView(Program program, List<Beneficiary> people,
            List<Payment> month, Map<String, Beneficiary> peopleById) {
        return new ProgramView(
            program.code,
            program.name,
            program.type,
            program.status,
            people.stream().filter(beneficiary -> beneficiary.programCode.equals(program.code)).count(),
            month.stream()
                .filter(payment -> peopleById.get(payment.beneficiaryId).programCode.equals(program.code))
                .map(payment -> payment.amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .toPlainString());
    }

    private static BeneficiaryView beneficiaryView(Beneficiary beneficiary, String programName) {
        return new BeneficiaryView(
            beneficiary.id,
            beneficiary.name,
            beneficiary.documentMasked,
            beneficiary.programCode,
            programName,
            beneficiary.nisMasked,
            beneficiary.birthDate,
            beneficiary.state,
            beneficiary.city,
            beneficiary.region,
            beneficiary.status,
            beneficiary.enrolledAt,
            beneficiary.dependents,
            beneficiary.familyIncome.toPlainString());
    }

    private static PaymentView paymentView(Payment payment, Beneficiary beneficiary, Program program) {
        return new PaymentView(
            payment.id,
            beneficiary.id,
            beneficiary.name,
            program.code,
            program.name,
            beneficiary.state,
            payment.period,
            payment.grossAmount.toPlainString(),
            payment.discountAmount.toPlainString(),
            payment.amount.toPlainString(),
            payment.status,
            payment.type,
            payment.paidAt);
    }

    private static AuditEventView auditEventView(AuditEvent event) {
        return new AuditEventView(event.id, event.eventDate, event.module, event.action, event.entity);
    }

    private static boolean matches(String value, String filter) {
        return filter.isEmpty() || value.equals(filter);
    }

    private static boolean contains(String value, String query) {
        return value.toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT));
    }

    private static <T> Map<String, T> index(List<T> values, Function<T, String> id) {
        return values.stream().collect(Collectors.toMap(id, Function.identity()));
    }

    private static <T> Page<T> page(List<T> values, Query query) {
        int start = Math.min(values.size(), query.page() * query.size());
        int end = Math.min(values.size(), start + query.size());
        return new Page<>(values.subList(start, end), values.size(), query.page(), query.size());
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "RECORD_NOT_FOUND");
    }
}

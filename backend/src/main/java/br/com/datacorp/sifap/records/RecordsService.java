package br.com.datacorp.sifap.records;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static br.com.datacorp.sifap.records.Views.*;

@Service
@Transactional(readOnly = true)
class RecordsService {
    private final ProgramRepository programs;
    private final BeneficiaryRepository beneficiaries;
    private final PaymentRepository payments;
    private static final Dataset DATASET = new Dataset("workshop-v1", true,
        LocalDate.of(2026, 8, 31), "workshop-fixtures-v1");

    RecordsService(ProgramRepository programs, BeneficiaryRepository beneficiaries, PaymentRepository payments) {
        this.programs = programs;
        this.beneficiaries = beneficiaries;
        this.payments = payments;
    }

    Page<ProgramView> programs(Query query) {
        var people = beneficiaries.findAll();
        var month = payments.findByPeriodOrderByIdAsc(query.period());
        var ids = index(people, p -> p.id);
        return page(programs.findAll().stream().sorted(Comparator.comparing(p -> p.code))
            .filter(p -> matches(p.status, query.status()) && contains(p.code + " " + p.name, query.q()))
            .map(p -> programView(p, people, month, ids)).toList(), query);
    }

    ProgramDetail program(String code) {
        Program program = programs.findById(code).orElseThrow(RecordsService::notFound);
        var people = beneficiaries.findAll();
        var month = payments.findByPeriodOrderByIdAsc("2026-08");
        var members = people.stream().filter(b -> b.programCode.equals(code))
            .sorted(Comparator.comparing(b -> b.id)).map(b -> beneficiaryView(b, program.name)).toList();
        return new ProgramDetail(programView(program, people, month, index(people, b -> b.id)), members);
    }

    Page<BeneficiaryView> beneficiaries(Query query) {
        var names = index(programs.findAll(), p -> p.code);
        var rows = beneficiaries.findAll().stream().sorted(Comparator.comparing(b -> b.id))
            .filter(b -> matches(b.programCode, query.program()) && matches(b.state, query.state())
                && matches(b.status, query.status()) && contains(b.name + " " + b.id + " " + b.city, query.q()))
            .map(b -> beneficiaryView(b, names.get(b.programCode).name)).toList();
        return page(rows, query);
    }

    BeneficiaryDetail beneficiary(String id) {
        Beneficiary person = beneficiaries.findById(id).orElseThrow(RecordsService::notFound);
        Program program = programs.findById(person.programCode).orElseThrow(RecordsService::notFound);
        return new BeneficiaryDetail(beneficiaryView(person, program.name),
            payments.findByBeneficiaryIdOrderByPeriodDesc(id).stream()
                .map(p -> paymentView(p, person, program)).toList());
    }

    Page<PaymentView> payments(Query query) { return page(paymentRows(query), query); }

    PaymentView payment(String id) {
        Payment payment = payments.findById(id).orElseThrow(RecordsService::notFound);
        var person = beneficiaries.findById(payment.beneficiaryId).orElseThrow(RecordsService::notFound);
        return paymentView(payment, person, programs.findById(person.programCode).orElseThrow(RecordsService::notFound));
    }

    List<PaymentView> paymentRows(Query query) {
        var people = index(beneficiaries.findAll(), p -> p.id);
        var catalog = index(programs.findAll(), p -> p.code);
        return payments.findByPeriodOrderByIdAsc(query.period()).stream()
            .map(p -> paymentView(p, people.get(p.beneficiaryId), catalog.get(people.get(p.beneficiaryId).programCode)))
            .filter(p -> matches(p.programCode(), query.program()) && matches(p.state(), query.state())
                && matches(p.status(), query.status())
                && contains(p.id() + " " + p.beneficiaryName() + " " + p.programName(), query.q())).toList();
    }

    Dashboard dashboard(String period) {
        Query query = Query.from(Map.of("period", period), Set.of("period"), Set.of());
        var rows = paymentRows(query);
        var people = beneficiaries.findAll();
        var catalog = programs.findAll().stream().sorted(Comparator.comparing(p -> p.code)).toList();
        var history = payments.findAll();
        var totals = new Totals(people.size(), catalog.stream().filter(p -> p.status.equals("ACTIVE")).count(),
            rows.size(), sum(rows, "PAID"), sum(rows, "PENDING"), people.stream().map(p -> p.state).distinct().count());
        var monthly = Query.PERIODS.stream().map(month -> new Monthly(month,
            history.stream().filter(p -> p.period.equals(month) && p.status.equals("PAID"))
                .map(p -> p.amount).reduce(BigDecimal.ZERO, BigDecimal::add).toPlainString(),
            history.stream().filter(p -> p.period.equals(month) && p.status.equals("PENDING"))
                .map(p -> p.amount).reduce(BigDecimal.ZERO, BigDecimal::add).toPlainString())).toList();
        return new Dashboard(DATASET, period, Query.PERIODS, totals, monthly,
            catalog.stream().map(p -> new ProgramDistribution(p.code, p.name,
                people.stream().filter(b -> b.programCode.equals(p.code)).count(),
                sum(rows.stream().filter(r -> r.programCode().equals(p.code)).toList(), ""))).toList(),
            people.stream().map(b -> b.state).distinct().sorted().map(state -> new StateDistribution(state,
                people.stream().filter(b -> b.state.equals(state)).count(),
                sum(rows.stream().filter(r -> r.state().equals(state)).toList(), ""))).toList(),
            rows.stream().sorted(Comparator.comparing(PaymentView::id).reversed()).limit(6).toList(),
            List.of(new Activity("EVT-001", "2026-08-31T12:00:00Z", "DATASET_LOADED", "DATASET", DATASET.id())));
    }

    Summary summary(Query query) {
        var rows = paymentRows(query);
        return new Summary(DATASET, query.period(), rows.size(), sum(rows, "PAID"), sum(rows, "PENDING"), sum(rows, "BLOCKED"),
            rows.stream().map(PaymentView::programCode).distinct().sorted().map(code -> {
                var group = rows.stream().filter(p -> p.programCode().equals(code)).toList();
                return new ProgramReport(code, group.getFirst().programName(), group.size(), sum(group, ""));
            }).toList(),
            rows.stream().map(PaymentView::state).distinct().sorted().map(state -> {
                var group = rows.stream().filter(p -> p.state().equals(state)).toList();
                return new StateReport(state, group.size(), sum(group, ""));
            }).toList());
    }

    private static String sum(List<PaymentView> rows, String status) {
        return rows.stream().filter(p -> matches(p.status(), status))
            .map(p -> new BigDecimal(p.amount())).reduce(BigDecimal.ZERO, BigDecimal::add).toPlainString();
    }
    private static ProgramView programView(Program program, List<Beneficiary> people,
            List<Payment> month, Map<String, Beneficiary> ids) {
        return new ProgramView(program.code, program.name, program.type, program.status,
            people.stream().filter(b -> b.programCode.equals(program.code)).count(),
            month.stream().filter(p -> ids.get(p.beneficiaryId).programCode.equals(program.code))
                .map(p -> p.amount).reduce(BigDecimal.ZERO, BigDecimal::add).toPlainString());
    }
    private static BeneficiaryView beneficiaryView(Beneficiary b, String program) {
        return new BeneficiaryView(b.id, b.name, b.documentMasked, b.programCode, program, b.state, b.city, b.status, b.enrolledAt);
    }
    private static PaymentView paymentView(Payment p, Beneficiary b, Program program) {
        return new PaymentView(p.id, b.id, b.name, program.code, program.name, b.state, p.period, p.amount.toPlainString(), p.status, p.paidAt);
    }
    private static boolean matches(String value, String filter) { return filter.isEmpty() || value.equals(filter); }
    private static boolean contains(String value, String q) { return value.toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT)); }
    private static <T> Map<String,T> index(List<T> values, Function<T,String> id) {
        return values.stream().collect(Collectors.toMap(id, Function.identity()));
    }
    private static <T> Page<T> page(List<T> values, Query query) {
        int start = Math.min(values.size(), query.page() * query.size());
        return new Page<>(values.subList(start, Math.min(values.size(), start + query.size())), values.size(), query.page(), query.size());
    }
    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "RECORD_NOT_FOUND");
    }
}

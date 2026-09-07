package br.com.datacorp.sifap.records;

import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
class RecordsController {
    private final RecordsService records;
    RecordsController(RecordsService records) { this.records = records; }

    @GetMapping("/dashboard")
    Views.Dashboard dashboard(@RequestParam Map<String,String> params) {
        return records.dashboard(Query.from(params, Set.of("period"), Set.of()).period());
    }
    @GetMapping("/programs")
    Views.Page<Views.ProgramView> programs(@RequestParam Map<String,String> params) {
        return records.programs(Query.from(params, Set.of("q","status","page","size"), Set.of("ACTIVE","SUSPENDED")));
    }
    @GetMapping("/programs/{id}")
    Views.ProgramDetail program(@PathVariable String id) { return records.program(id); }
    @GetMapping("/beneficiaries")
    Views.Page<Views.BeneficiaryView> beneficiaries(@RequestParam Map<String,String> params) {
        return records.beneficiaries(Query.from(params, Set.of("q","program","state","status","page","size"),
            Set.of("ACTIVE","SUSPENDED","PENDING")));
    }
    @GetMapping("/beneficiaries/{id}")
    Views.BeneficiaryDetail beneficiary(@PathVariable String id) { return records.beneficiary(id); }
    @GetMapping("/payments")
    Views.Page<Views.PaymentView> payments(@RequestParam Map<String,String> params) {
        return records.payments(Query.from(params, Set.of("q","period","program","state","status","page","size"),
            Set.of("PAID","PENDING","BLOCKED")));
    }
    @GetMapping("/payments/{id}")
    Views.PaymentView payment(@PathVariable String id) { return records.payment(id); }
    @GetMapping("/reports/summary")
    Views.Summary summary(@RequestParam Map<String,String> params) {
        return records.summary(Query.from(params, Set.of("period","program","state"), Set.of()));
    }
    @GetMapping(value = "/reports/payments.csv", produces = "text/csv")
    ResponseEntity<byte[]> csv(@RequestParam Map<String,String> params) {
        String locale = params.getOrDefault("locale", "en");
        if (!Set.of("en","es","pt-BR").contains(locale))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_LOCALE");
        var queryParams = new HashMap<>(params);
        queryParams.remove("locale");
        var query = Query.from(queryParams, Set.of("period","program","state"), Set.of());
        byte[] content = Csv.payments(records.paymentRows(query), locale).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok().contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sifap-synthetic-" + query.period() + ".csv\"")
            .cacheControl(CacheControl.noStore()).body(content);
    }
}

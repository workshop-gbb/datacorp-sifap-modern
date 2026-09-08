package br.com.datacorp.sifap.records;

import static org.junit.jupiter.api.Assertions.*;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class QueryAndCsvTest {
    @Test void should_validate_query_boundaries() { // REQ-106
        Set<String> fields = Set.of("q", "page", "size", "period", "state", "program", "status");
        var query = Query.from(Map.of(), fields, Set.of("PAID"));
        assertAll(() -> assertEquals(0, query.page()), () -> assertEquals(12, query.size()),
            () -> assertEquals("2026-08", query.period()));
        for (var bad : java.util.List.of(Map.of("page", "-1"), Map.of("size", "101"),
                Map.of("size", "NaN"), Map.of("period", "yesterday"), Map.of("state", "XX"),
                Map.of("status", "UNKNOWN"), Map.of("program", "OTHER"), Map.of("x", "1"),
                Map.of("q", "x".repeat(81)))) {
            assertThrows(ResponseStatusException.class, () -> Query.from(bad, fields, Set.of("PAID")));
        }
    }
    @Test void should_escape_csv_and_prevent_spreadsheet_execution() { // REQ-108
        assertAll(
            () -> assertEquals("\"'=1+1\"", Csv.cell("=1+1")),
            () -> assertEquals("\"' +cmd\"", Csv.cell(" +cmd")),
            () -> assertEquals("\"a,\"\"b\"\"\"", Csv.cell("a,\"b\"")),
            () -> assertEquals("\"\"", Csv.cell(null)),
            () -> assertEquals("\"a\nb\"", Csv.cell("a\nb")));
    }
}

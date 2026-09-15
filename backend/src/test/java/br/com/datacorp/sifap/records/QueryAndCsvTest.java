package br.com.datacorp.sifap.records;

import static org.junit.jupiter.api.Assertions.*;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class QueryAndCsvTest {
    @Test void should_validate_legacy_snapshot_query_boundaries() { // REQ-127 REQ-129
        Set<String> fields = Set.of("q", "page", "size", "period", "state", "program", "status");
        var query = Query.from(Map.of(), fields, Set.of("C"));
        assertAll(() -> assertEquals(0, query.page()), () -> assertEquals(12, query.size()),
            () -> assertEquals("2018-01", query.period()));
        for (var bad : java.util.List.of(Map.of("page", "-1"), Map.of("size", "101"),
                Map.of("size", "NaN"), Map.of("period", "yesterday"), Map.of("state", "XX"),
                Map.of("status", "UNKNOWN"), Map.of("program", "OTHER"), Map.of("x", "1"),
                Map.of("q", "x".repeat(81)), Map.of("q", "12345678901"),
                Map.of("q", "123.456.789-01"), Map.of("q", "123 456 789 01"),
                Map.of("q", "CPF 123.456.789-01"),
                Map.of("q", "ticket 42 / CPF 123.456.789-01"))) {
            assertThrows(ResponseStatusException.class, () -> Query.from(bad, fields, Set.of("C")));
        }
        assertEquals("900000000001505",
            Query.from(Map.of("q", "900000000001505"), fields, Set.of("C")).q());
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

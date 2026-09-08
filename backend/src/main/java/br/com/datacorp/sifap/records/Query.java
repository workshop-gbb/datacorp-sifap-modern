package br.com.datacorp.sifap.records;

import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

record Query(String q, String period, String program, String state, String status, int page, int size) {
    static final java.util.List<String> PERIODS =
        java.util.List.of("2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08");
    private static final Set<String> STATES = Set.of("SP","RJ","MG","BA","PE","CE","RS","PR","PA","DF");

    static Query from(Map<String, String> params, Set<String> allowed, Set<String> statuses) {
        if (!allowed.containsAll(params.keySet())) throw invalid();
        String q = params.getOrDefault("q", "").strip();
        String period = params.getOrDefault("period", "2026-08");
        String program = params.getOrDefault("program", "");
        String state = params.getOrDefault("state", "");
        String status = params.getOrDefault("status", "");
        int page = integer(params.getOrDefault("page", "0"));
        int size = integer(params.getOrDefault("size", "12"));
        if (q.length() > 80 || !PERIODS.contains(period)
                || (!program.isEmpty() && !program.matches("PRG-00[1-6]"))
                || (!state.isEmpty() && !STATES.contains(state))
                || (!status.isEmpty() && !statuses.contains(status))
                || page < 0 || page > 10000 || size < 1 || size > 100) throw invalid();
        return new Query(q, period, program, state, status, page, size);
    }

    private static int integer(String value) {
        try { return Integer.parseInt(value); }
        catch (NumberFormatException exception) { throw invalid(); }
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_QUERY");
    }
}

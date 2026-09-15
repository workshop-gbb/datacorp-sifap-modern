package br.com.datacorp.sifap.records;

import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

record Query(String q, String period, String program, String state, String status, int page, int size) {
    static final java.util.List<String> PERIODS =
        java.util.List.of("2017-10", "2017-11", "2017-12", "2018-01");
    private static final Set<String> PROGRAMS = Set.of("PBF1", "BPC1", "PETI", "AUX1", "GASF", "IDOS");
    private static final Set<String> STATES =
        Set.of("AC", "AM", "BA", "CE", "DF", "GO", "MG", "PE", "PR", "RJ", "RS", "SC", "SP");
    private static final Pattern COMPLETE_PERSONAL_IDENTIFIER =
        Pattern.compile("(?<!\\d)(?:\\d[.\\-\\s]*){11}(?!\\d)");

    static Query from(Map<String, String> params, Set<String> allowed, Set<String> statuses) {
        if (!allowed.containsAll(params.keySet())) throw invalid();
        String q = params.getOrDefault("q", "").strip();
        String period = params.getOrDefault("period", "2018-01");
        String program = params.getOrDefault("program", "");
        String state = params.getOrDefault("state", "");
        String status = params.getOrDefault("status", "");
        int page = integer(params.getOrDefault("page", "0"));
        int size = integer(params.getOrDefault("size", "12"));
        // REQ-129: a complete CPF/NIS-shaped query must never be placed in a URL.
        if (q.length() > 80 || isCompletePersonalIdentifier(q) || !PERIODS.contains(period)
                || (!program.isEmpty() && !PROGRAMS.contains(program))
                || (!state.isEmpty() && !STATES.contains(state))
                || (!status.isEmpty() && !statuses.contains(status))
                || page < 0 || page > 10000 || size < 1 || size > 100) throw invalid();
        return new Query(q, period, program, state, status, page, size);
    }

    private static boolean isCompletePersonalIdentifier(String value) {
        return COMPLETE_PERSONAL_IDENTIFIER.matcher(value).find();
    }

    private static int integer(String value) {
        try { return Integer.parseInt(value); }
        catch (NumberFormatException exception) { throw invalid(); }
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_QUERY");
    }
}

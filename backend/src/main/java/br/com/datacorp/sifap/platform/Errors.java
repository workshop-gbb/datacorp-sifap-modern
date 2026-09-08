package br.com.datacorp.sifap.platform;

import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
class Errors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ProblemDetail> status(ResponseStatusException error) {
        return problem(error.getStatusCode(), error.getReason() == null ? "REQUEST_FAILED" : error.getReason());
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> validation() { return problem(HttpStatus.BAD_REQUEST, "INVALID_INPUT"); }
    private ResponseEntity<ProblemDetail> problem(HttpStatusCode status, String code) {
        var detail = ProblemDetail.forStatusAndDetail(status, code);
        detail.setProperty("code", code);
        detail.setProperty("correlationId", UUID.randomUUID().toString());
        return ResponseEntity.status(status).body(detail);
    }
}

package br.com.datacorp.sifap.integrations;

import java.io.IOException;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@RestController
@RequestMapping("/api/v1/integrations")
class IntegrationsController {
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4))
        .followRedirects(HttpClient.Redirect.NEVER).build();
    private final JsonMapper json = JsonMapper.builder().build();
    private final URI legacy;
    private final URI ibge;
    private Snapshot cached;
    private Instant expiresAt = Instant.EPOCH;

    record Reference(String code, String name) {}
    record Integration(String id, String name, String kind, String status, Instant checkedAt,
                       long latencyMs, Integer httpStatus, String scope, String messageCode, List<Reference> records) {}
    record Snapshot(Instant checkedAt, List<Integration> integrations) {}

    IntegrationsController(@Value("${sifap.legacy-url}") String legacy, @Value("${sifap.ibge-url}") String ibge) {
        this.legacy = trusted(legacy);
        this.ibge = trusted(ibge);
    }
    private static URI trusted(String value) {
        URI uri = URI.create(value);
        boolean testLoopback = "http".equals(uri.getScheme())
            && Set.of("localhost","127.0.0.1").contains(uri.getHost());
        if ((!testLoopback && !"https".equals(uri.getScheme())) || uri.getHost() == null
                || uri.getUserInfo() != null || uri.getFragment() != null)
            throw new IllegalArgumentException("Integration origin must use HTTPS");
        return uri;
    }

    @GetMapping
    synchronized Snapshot integrations() {
        if (cached != null && Instant.now().isBefore(expiresAt)) return cached;
        cached = new Snapshot(Instant.now(), List.of(check("legacy", "SIFAP Natural / Adabas", legacy),
            check("ibge", "IBGE", ibge)));
        expiresAt = Instant.now().plusSeconds(60);
        return cached;
    }
    private Integration check(String id, String name, URI uri) {
        Instant checked = Instant.now();
        long start = System.nanoTime();
        String kind = id.equals("legacy") ? "LIVENESS" : "REFERENCE_DATA";
        String scope = id.equals("legacy") ? "LEGACY_LIVENESS_ONLY" : "PUBLIC_GEOGRAPHY";
        Integer status = null;
        String message;
        List<Reference> records = new ArrayList<>();
        try {
            var request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(6))
                .header("Accept", id.equals("ibge") ? "application/json" : "text/plain").GET().build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            status = response.statusCode();
            message = status == 200 ? "OK" : "UPSTREAM_ERROR";
            if (response.body().length() > 65536) message = "INVALID_RESPONSE";
            else if (message.equals("OK") && id.equals("ibge")) {
                var root = json.readTree(response.body());
                if (!root.isArray() || root.isEmpty() || root.size() > 100) message = "INVALID_RESPONSE";
                else {
                    for (var state : root) {
                        if (!state.path("sigla").isString() || !state.path("nome").isString()) {
                            message = "INVALID_RESPONSE";
                            records.clear();
                            break;
                        }
                        records.add(new Reference(state.path("sigla").asString(), state.path("nome").asString()));
                    }
                    records.sort(Comparator.comparing(Reference::code));
                }
            }
        } catch (HttpTimeoutException exception) {
            message = "TIMEOUT";
        } catch (IOException exception) {
            message = "NETWORK_ERROR";
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            message = "NETWORK_ERROR";
        } catch (JacksonException exception) {
            message = "INVALID_RESPONSE";
        }
        return new Integration(id, name, kind, message.equals("OK") ? "CONNECTED" : "UNAVAILABLE", checked,
            (System.nanoTime() - start) / 1_000_000, status, scope, message, List.copyOf(records));
    }
}

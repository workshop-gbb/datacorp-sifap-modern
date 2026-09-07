package br.com.datacorp.sifap.integrations;

import static org.junit.jupiter.api.Assertions.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class IntegrationsTest {
    @Test void should_check_real_http_responses_and_cache_results() throws Exception { // REQ-109
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger calls = new AtomicInteger();
        server.createContext("/health", exchange -> {
            calls.incrementAndGet();
            byte[] body = "ok".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (var out = exchange.getResponseBody()) { out.write(body); }
        });
        server.createContext("/states", exchange -> {
            byte[] body = "[{\"sigla\":\"SP\",\"nome\":\"Sao Paulo\"},{\"sigla\":\"BA\",\"nome\":\"Bahia\"}]".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (var out = exchange.getResponseBody()) { out.write(body); }
        });
        server.start();
        try {
            String base = "http://127.0.0.1:" + server.getAddress().getPort();
            var controller = new IntegrationsController(base + "/health", base + "/states");
            var first = controller.integrations();
            assertSame(first, controller.integrations());
            assertEquals(1, calls.get());
            assertTrue(first.integrations().stream().allMatch(i -> i.status().equals("CONNECTED")));
            assertEquals("BA", first.integrations().get(1).records().getFirst().code());
        } finally { server.stop(0); }
    }
    @Test void should_never_report_a_failed_upstream_as_connected() throws Exception { // REQ-109 REQ-111
        for (String payload : java.util.List.of("invalid json", "[]", "{}", "[{\"sigla\":2}]")) {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                byte[] body = payload.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(exchange.getRequestURI().getPath().equals("/health") ? 503 : 200, body.length);
                try (var out = exchange.getResponseBody()) { out.write(body); }
            });
            server.start();
            try {
                String base = "http://127.0.0.1:" + server.getAddress().getPort();
                var result = new IntegrationsController(base + "/health", base + "/states").integrations();
                assertTrue(result.integrations().stream().allMatch(i -> i.status().equals("UNAVAILABLE")));
                assertEquals("UPSTREAM_ERROR", result.integrations().getFirst().messageCode());
            } finally { server.stop(0); }
        }
    }
    @Test void should_reject_unsafe_urls_and_report_network_failure() { // REQ-109
        assertThrows(IllegalArgumentException.class, () ->
            new IntegrationsController("http://external.example/health", "https://ibge.gov.br"));
        assertThrows(IllegalArgumentException.class, () ->
            new IntegrationsController("https://user:secret@host/health", "https://ibge.gov.br"));
        assertThrows(IllegalArgumentException.class, () ->
            new IntegrationsController("https://host/health#fragment", "https://ibge.gov.br"));
        var result = new IntegrationsController("http://127.0.0.1:1", "http://127.0.0.1:1").integrations();
        assertTrue(result.integrations().stream().allMatch(i -> i.messageCode().equals("NETWORK_ERROR")));
    }
}

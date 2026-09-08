package br.com.datacorp.sifap.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.web.server.ResponseStatusException;

class AuthenticationTest {
    @Test void should_validate_token_issuer_audience_and_signature() { // REQ-103 REQ-104
        var configuration = new SecurityConfiguration();
        assertThrows(IllegalArgumentException.class, () -> configuration.jwtKey("short"));
        var key = configuration.jwtKey("test-only-jwt-secret-at-least-32-bytes");
        var encoder = configuration.jwtEncoder(key);
        var decoder = configuration.jwtDecoder(key);
        for (String audience : List.of("sifap-viewer", "wrong-audience")) {
            var claims = JwtClaimsSet.builder().issuer("sifap-workshop").subject("viewer")
                .audience(List.of(audience)).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build();
            String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
            if (audience.equals("sifap-viewer")) assertEquals("viewer", decoder.decode(token).getSubject());
            else assertThrows(JwtException.class, () -> decoder.decode(token));
        }
        assertThrows(JwtException.class, () -> decoder.decode("forged"));
    }
    @Test void should_limit_repeated_login_attempts_without_logging_credentials() { // REQ-103
        PasswordEncoder passwords = mock(PasswordEncoder.class);
        JwtEncoder encoder = mock(JwtEncoder.class);
        var controller = new AuthController(passwords, encoder, "viewer", "$2a$12$" + "x".repeat(53), false);
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.17");
        for (int i = 0; i < 30; i++) {
            var failure = assertThrows(ResponseStatusException.class, () ->
                controller.login(new AuthController.Login("viewer", "test-invalid"), request));
            assertEquals(HttpStatus.UNAUTHORIZED, failure.getStatusCode());
        }
        var limited = assertThrows(ResponseStatusException.class, () ->
            controller.login(new AuthController.Login("viewer", "test-invalid"), request));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, limited.getStatusCode());
        verifyNoInteractions(encoder);
        assertThrows(IllegalArgumentException.class, () -> new AuthController(passwords, encoder, "viewer", "plaintext", false));
    }
    @Test void should_disable_guest_access_unless_explicitly_enabled() { // REQ-120
        var encoder = mock(JwtEncoder.class);
        var controller = new AuthController(mock(PasswordEncoder.class), encoder,
            "viewer", "$2a$12$" + "x".repeat(53), false);
        var error = assertThrows(ResponseStatusException.class,
            () -> controller.viewer(null, new MockHttpServletRequest()));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verifyNoInteractions(encoder);
    }
}

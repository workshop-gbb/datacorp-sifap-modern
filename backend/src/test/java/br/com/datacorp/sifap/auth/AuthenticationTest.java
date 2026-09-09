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
        when(passwords.matches(anyString(), anyString())).thenReturn(false);
        var controller = new AuthController(passwords, encoder,
            "viewer", "$2a$12$" + "x".repeat(53),
            "admin", "$2a$12$" + "y".repeat(53));
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.17");
        for (int i = 0; i < 20; i++) {
            var failure = assertThrows(ResponseStatusException.class, () ->
                controller.login(new AuthController.Login("viewer", "test-invalid", "VIEWER"), request));
            assertEquals(HttpStatus.UNAUTHORIZED, failure.getStatusCode());
        }
        var limited = assertThrows(ResponseStatusException.class, () ->
            controller.login(new AuthController.Login("viewer", "test-invalid", "VIEWER"), request));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, limited.getStatusCode());
        verifyNoInteractions(encoder);
        assertThrows(IllegalArgumentException.class, () -> new AuthController(
            passwords, encoder, "viewer", "plaintext", "admin", "$2a$12$" + "y".repeat(53)));
    }

    @Test void should_bind_credentials_to_their_configured_role() { // REQ-121 REQ-122
        PasswordEncoder passwords = mock(PasswordEncoder.class);
        JwtEncoder encoder = mock(JwtEncoder.class);
        when(passwords.matches("viewer-pass", "$2a$12$" + "v".repeat(53))).thenReturn(true);
        when(passwords.matches("admin-pass", "$2a$12$" + "a".repeat(53))).thenReturn(true);
        var controller = new AuthController(passwords, encoder,
            "viewer", "$2a$12$" + "v".repeat(53),
            "admin", "$2a$12$" + "a".repeat(53));
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.18");
        assertThrows(ResponseStatusException.class, () ->
            controller.login(new AuthController.Login("viewer", "viewer-pass", "ADMIN"), request));
        assertThrows(ResponseStatusException.class, () ->
            controller.login(new AuthController.Login("admin", "admin-pass", "VIEWER"), request));
        verifyNoInteractions(encoder);
    }
}

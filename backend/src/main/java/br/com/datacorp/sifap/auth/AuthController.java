package br.com.datacorp.sifap.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {
    private final PasswordEncoder passwords;
    private final JwtEncoder tokens;
    private final String username;
    private final String passwordHash;
    private final Map<String, Attempt> attempts = new HashMap<>();
    private static final long SESSION_SECONDS = 3600;
    private record Attempt(int count, long until) {}
    record Login(@NotBlank @Size(max=64) String username, @NotBlank @Size(max=128) String password) {}
    record User(String id, String displayName, String role) {}
    record Session(String accessToken, long expiresIn, User user) {}

    AuthController(PasswordEncoder passwords, JwtEncoder tokens,
            @Value("${sifap.viewer.username}") String username,
            @Value("${sifap.viewer.password-hash}") String passwordHash) {
        if (!passwordHash.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$"))
            throw new IllegalArgumentException("A bcrypt viewer password hash is required");
        this.passwords = passwords;
        this.tokens = tokens;
        this.username = username;
        this.passwordHash = passwordHash;
    }
    @PostMapping("/login")
    ResponseEntity<Session> login(@Valid @RequestBody Login request, HttpServletRequest http) {
        limit(http.getRemoteAddr());
        boolean validPassword = passwords.matches(request.password(), passwordHash);
        if (!username.equals(request.username()) || !validPassword)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        Instant now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(SecurityConfiguration.ISSUER)
            .audience(List.of(SecurityConfiguration.AUDIENCE)).subject(username)
            .issuedAt(now).expiresAt(now.plusSeconds(SESSION_SECONDS)).id(UUID.randomUUID().toString())
            .claim("roles", List.of("VIEWER")).build();
        String token = tokens.encode(JwtEncoderParameters.from(
            JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(new Session(token, SESSION_SECONDS, new User(username, "Workshop viewer", "VIEWER")));
    }
    @GetMapping("/me")
    User me(Authentication auth) { return new User(auth.getName(), "Workshop viewer", "VIEWER"); }

    private synchronized void limit(String source) {
        long now = System.currentTimeMillis();
        attempts.entrySet().removeIf(entry -> entry.getValue().until() < now);
        Attempt attempt = attempts.getOrDefault(source, new Attempt(0, now + 60000));
        if (attempt.count() >= 30 || attempts.size() >= 1024)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED");
        attempts.put(source, new Attempt(attempt.count() + 1, attempt.until()));
    }
}

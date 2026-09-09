package br.com.datacorp.sifap.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {
    private static final long SESSION_SECONDS = 3600;
    private static final String BCRYPT = "^\\$2[aby]\\$\\d{2}\\$.{53}$";

    private final PasswordEncoder passwords;
    private final JwtEncoder tokens;
    private final Map<String, Account> accounts;
    private final Map<String, Attempt> attempts = new HashMap<>();

    private record Account(String username, String passwordHash, String displayName) {}
    private record Attempt(int count, long until) {}

    record Login(@NotBlank @Size(max = 64) String username,
                 @NotBlank @Size(max = 128) String password,
                 @NotBlank @Pattern(regexp = "ADMIN|VIEWER") String role) {}
    record User(String id, String displayName, String role) {}
    record Session(String accessToken, long expiresIn, User user) {}

    AuthController(PasswordEncoder passwords, JwtEncoder tokens,
            @Value("${sifap.viewer.username}") String viewerUsername,
            @Value("${sifap.viewer.password-hash}") String viewerHash,
            @Value("${sifap.admin.username}") String adminUsername,
            @Value("${sifap.admin.password-hash}") String adminHash) {
        if (!viewerHash.matches(BCRYPT) || !adminHash.matches(BCRYPT))
            throw new IllegalArgumentException("Both accounts require a bcrypt password hash");
        this.passwords = passwords;
        this.tokens = tokens;
        this.accounts = Map.of(
            "VIEWER", new Account(viewerUsername, viewerHash, "Workshop viewer"),
            "ADMIN", new Account(adminUsername, adminHash, "Workshop administrator"));
    }

    @PostMapping("/login")
    ResponseEntity<Session> login(@Valid @RequestBody Login request, HttpServletRequest http) {
        String source = http.getRemoteAddr();
        limit(source);
        Account account = accounts.get(request.role());
        // The password is always verified so a wrong role cannot be told apart by timing.
        boolean validPassword = passwords.matches(request.password(), account.passwordHash());
        if (!account.username().equals(request.username()) || !validPassword)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        synchronized (this) {
            attempts.remove(source);
        }
        Instant now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(SecurityConfiguration.ISSUER)
            .audience(List.of(SecurityConfiguration.AUDIENCE)).subject(account.username())
            .issuedAt(now).expiresAt(now.plusSeconds(SESSION_SECONDS)).id(UUID.randomUUID().toString())
            .claim("roles", List.of(request.role())).build();
        String token = tokens.encode(JwtEncoderParameters.from(
            JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(new Session(token, SESSION_SECONDS,
                new User(account.username(), account.displayName(), request.role())));
    }

    @GetMapping("/me")
    User me(Authentication auth) {
        String role = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority)
            .filter(value -> value.startsWith("ROLE_")).map(value -> value.substring(5))
            .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "NO_ROLE"));
        Account account = accounts.get(role);
        if (account == null)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "UNKNOWN_ROLE");
        return new User(auth.getName(), account.displayName(), role);
    }

    private synchronized void limit(String source) {
        long now = System.currentTimeMillis();
        attempts.entrySet().removeIf(entry -> entry.getValue().until() < now);
        Attempt attempt = attempts.getOrDefault(source, new Attempt(0, now + 300000));
        if (attempt.count() >= 20 || attempts.size() >= 1024)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED");
        attempts.put(source, new Attempt(attempt.count() + 1, attempt.until()));
    }
}

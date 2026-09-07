package br.com.datacorp.sifap.auth;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** Gera o hash no bootstrap sem expor a senha em argumentos de processo. */
public final class HashPassword {
    private HashPassword() {}
    public static void main(String[] args) throws IOException {
        var reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String password = reader.readLine();
        if (password == null || password.length() < 16 || password.length() > 128)
            throw new IllegalArgumentException("Password input must contain 16 to 128 characters");
        System.out.print(new BCryptPasswordEncoder(12).encode(password));
    }
}

package br.com.escreveaqui.backend.admin;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AdminSessionStore {

    private static final long TTL_SECONDS = 12 * 60 * 60;

    private final Map<String, SessionEntry> sessions = new ConcurrentHashMap<>();

    public String createSession(String username) {
        purgeExpired();
        String token = UUID.randomUUID().toString();
        sessions.put(token, new SessionEntry(username, Instant.now().plusSeconds(TTL_SECONDS)));
        return token;
    }

    public Optional<String> resolveUsername(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        purgeExpired();
        SessionEntry entry = sessions.get(token);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            sessions.remove(token);
            return Optional.empty();
        }
        return Optional.of(entry.username());
    }

    public void invalidate(String token) {
        if (token != null) {
            sessions.remove(token);
        }
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        sessions.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));
    }

    private record SessionEntry(String username, Instant expiresAt) {}
}

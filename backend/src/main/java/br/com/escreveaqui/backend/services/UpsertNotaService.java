package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.exceptions.NoteAccessDeniedException;
import br.com.escreveaqui.backend.models.Nota;
import br.com.escreveaqui.backend.repositories.NotaRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.regex.Pattern;

@Slf4j
@Service
public class UpsertNotaService {

    private static final Pattern ACCENT_PATTERN =
            Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    private final NotaRepository notaRepository;
    private final PasswordEncoder passwordEncoder;
    private final Counter createCounter;
    private final Counter updateCounter;

    public UpsertNotaService(
            NotaRepository notaRepository,
            PasswordEncoder passwordEncoder,
            MeterRegistry registry
    ) {
        this.notaRepository = notaRepository;
        this.passwordEncoder = passwordEncoder;
        this.createCounter = Counter.builder("notes.upsert")
                .tag("operation", "create")
                .description("Notas criadas")
                .register(registry);
        this.updateCounter = Counter.builder("notes.upsert")
                .tag("operation", "update")
                .description("Notas atualizadas")
                .register(registry);
    }

    @CacheEvict(value = "notas", allEntries = true)
    @Transactional
    public void execute(String slug, String content, Long ttlMinutes, String accessToken, String token) {
        String safeSlug = makeSlug(slug);

        Nota nota = notaRepository.findBySlug(safeSlug)
                .orElseGet(() -> Nota.builder().slug(safeSlug).build());
        boolean isNew = nota.getId() == null;

        if (!isNew && nota.isProtected() && !isTokenValid(token, nota.getAccessTokenHash())) {
            throw new NoteAccessDeniedException();
        }

        nota.setContent(content);
        applyTtl(nota, ttlMinutes);
        applyAccessToken(nota, accessToken);

        notaRepository.save(nota);

        if (isNew) createCounter.increment();
        else updateCounter.increment();
        log.debug("{} nota: slug='{}'", isNew ? "Criada" : "Atualizada", safeSlug);
    }

    private void applyTtl(Nota nota, Long ttlMinutes) {
        nota.setTtlMinutes(ttlMinutes);
        if (ttlMinutes != null && ttlMinutes > 0) {
            nota.setExpiresAt(OffsetDateTime.now().plusMinutes(ttlMinutes));
        } else {
            nota.setExpiresAt(null);
            if (ttlMinutes != null && ttlMinutes <= 0) {
                nota.setTtlMinutes(null);
            }
        }
    }

    private void applyAccessToken(Nota nota, String accessToken) {
        if (accessToken == null) {
            return;
        }
        if (accessToken.isBlank()) {
            nota.setAccessTokenHash(null);
            return;
        }
        nota.setAccessTokenHash(passwordEncoder.encode(accessToken));
    }

    private boolean isTokenValid(String token, String hash) {
        return token != null && passwordEncoder.matches(token, hash);
    }

    public static String makeSlug(String input) {
        if (input == null) return "";

        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return ACCENT_PATTERN.matcher(normalized).replaceAll("")
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}

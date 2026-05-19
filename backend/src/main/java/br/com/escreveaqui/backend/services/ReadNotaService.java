package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.dtos.NotaResponseDTO;
import br.com.escreveaqui.backend.exceptions.NoteAccessDeniedException;
import br.com.escreveaqui.backend.models.Nota;
import br.com.escreveaqui.backend.repositories.NotaRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Slf4j
@Service
public class ReadNotaService {

    private final NotaRepository notaRepository;
    private final PasswordEncoder passwordEncoder;
    private final Counter hitCounter;
    private final Counter missCounter;

    public ReadNotaService(
            NotaRepository notaRepository,
            PasswordEncoder passwordEncoder,
            MeterRegistry registry
    ) {
        this.notaRepository = notaRepository;
        this.passwordEncoder = passwordEncoder;
        this.hitCounter = Counter.builder("notes.read")
                .tag("result", "hit")
                .description("Notas encontradas no banco")
                .register(registry);
        this.missCounter = Counter.builder("notes.read")
                .tag("result", "miss")
                .description("Slugs acessados sem nota existente")
                .register(registry);
    }

    @Transactional(readOnly = true)
    public NotaResponseDTO execute(String slug, String token) {
        String safeSlug = UpsertNotaService.makeSlug(slug);

        return notaRepository.findBySlug(safeSlug)
                .map(nota -> {
                    if (NoteExpiration.isExpired(nota)) {
                        missCounter.increment();
                        log.debug("Nota expirada: slug='{}'", safeSlug);
                        return new NotaResponseDTO(
                                nota.getSlug(),
                                null,
                                nota.getUpdatedAt(),
                                null,
                                null,
                                false,
                                true
                        );
                    }
                    hitCounter.increment();
                    log.debug("Nota encontrada: slug='{}'", safeSlug);
                    return toResponse(nota, token);
                })
                .orElseGet(() -> {
                    missCounter.increment();
                    log.debug("Nota não encontrada, retornando vazia: slug='{}'", safeSlug);
                    return new NotaResponseDTO(safeSlug, "", OffsetDateTime.now(), null, null, false, false);
                });
    }

    private NotaResponseDTO toResponse(Nota nota, String token) {
        if (nota.isProtected()) {
            if (token == null) {
                return new NotaResponseDTO(
                        nota.getSlug(),
                        null,
                        nota.getUpdatedAt(),
                        nota.getTtlMinutes(),
                        nota.getExpiresAt(),
                        true,
                        false
                );
            }
            if (!passwordEncoder.matches(token, nota.getAccessTokenHash())) {
                throw new NoteAccessDeniedException();
            }
        }

        return new NotaResponseDTO(
                nota.getSlug(),
                nota.getContent(),
                nota.getUpdatedAt(),
                nota.getTtlMinutes(),
                nota.getExpiresAt(),
                nota.isProtected(),
                false
        );
    }
}

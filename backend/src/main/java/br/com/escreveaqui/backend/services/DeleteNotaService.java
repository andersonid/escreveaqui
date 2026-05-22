package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.models.Nota;
import br.com.escreveaqui.backend.repositories.NotaRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
public class DeleteNotaService {

    private final NotaRepository notaRepository;
    private final AttachmentService attachmentService;
    private final Counter deletedCounter;

    public DeleteNotaService(
            NotaRepository notaRepository,
            AttachmentService attachmentService,
            MeterRegistry registry) {
        this.notaRepository = notaRepository;
        this.attachmentService = attachmentService;
        this.deletedCounter = Counter.builder("notes.deleted")
                .description("Notas removidas pelo job de limpeza")
                .register(registry);
    }

    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void execute() {
        OffsetDateTime now = OffsetDateTime.now();
        log.info("Iniciando limpeza de notas expiradas antes de {}", now);

        List<Nota> expired = notaRepository.findExpiredNotes(now);
        for (Nota nota : expired) {
            try {
                attachmentService.purgeAllForNote(nota.getId());
            } catch (Exception e) {
                log.error("Falha ao purgar anexos S3 da nota {}: {}", nota.getSlug(), e.getMessage());
            }
        }

        int deleted = notaRepository.deleteExpiredNotes(now);
        deletedCounter.increment(deleted);

        log.info("Limpeza concluída: {} nota(s) removida(s)", deleted);
    }
}

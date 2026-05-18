package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.repositories.NotaRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Slf4j
@Service
public class DeleteNotaService {

    private final NotaRepository notaRepository;
    private final Counter deletedCounter;

    public DeleteNotaService(NotaRepository notaRepository, MeterRegistry registry) {
        this.notaRepository = notaRepository;
        this.deletedCounter = Counter.builder("notes.deleted")
                .description("Notas removidas pelo job de limpeza")
                .register(registry);
    }

    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void execute() {
        OffsetDateTime now = OffsetDateTime.now();
        log.info("Iniciando limpeza de notas expiradas antes de {}", now);

        int deleted = notaRepository.deleteExpiredNotes(now);
        deletedCounter.increment(deleted);

        log.info("Limpeza concluída: {} nota(s) removida(s)", deleted);
    }
}

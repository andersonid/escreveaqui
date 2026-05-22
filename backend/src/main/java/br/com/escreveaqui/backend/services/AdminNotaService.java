package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.dtos.admin.AdminNoteListItemDTO;
import br.com.escreveaqui.backend.dtos.admin.AdminNoteUpdateRequestDTO;
import br.com.escreveaqui.backend.exceptions.AdminNotFoundException;
import br.com.escreveaqui.backend.models.Nota;
import br.com.escreveaqui.backend.repositories.NotaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminNotaService {

    private final NotaRepository notaRepository;
    private final AttachmentService attachmentService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<AdminNoteListItemDTO> listAll() {
        return notaRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toListItem)
                .toList();
    }

    @Transactional
    public AdminNoteListItemDTO updateSettings(String slug, AdminNoteUpdateRequestDTO request) {
        Nota nota = notaRepository.findBySlug(UpsertNotaService.makeSlug(slug))
                .orElseThrow(() -> new AdminNotFoundException("Nota não encontrada"));

        if (Boolean.TRUE.equals(request.configureExpiration())) {
            NoteExpiration.applyPolicy(nota, request.ttlMinutes());
        }

        applyAccessToken(nota, request.accessToken());

        notaRepository.save(nota);
        return toListItem(nota);
    }

    @Transactional
    public void deleteBySlug(String slug) {
        String safeSlug = UpsertNotaService.makeSlug(slug);
        Nota nota = notaRepository.findBySlug(safeSlug)
                .orElseThrow(() -> new AdminNotFoundException("Nota não encontrada"));
        attachmentService.purgeAllForNote(nota.getId());
        notaRepository.delete(nota);
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

    private AdminNoteListItemDTO toListItem(Nota nota) {
        return new AdminNoteListItemDTO(
                nota.getId(),
                nota.getSlug(),
                nota.getCreatedAt(),
                nota.getUpdatedAt(),
                nota.getCreatedClientIp(),
                nota.getLastClientIp(),
                nota.getTtlMinutes(),
                nota.getExpiresAt(),
                nota.isProtected(),
                NoteExpiration.isExpired(nota)
        );
    }
}

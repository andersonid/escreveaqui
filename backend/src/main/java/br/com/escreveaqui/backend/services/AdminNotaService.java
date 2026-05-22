package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.dtos.admin.AdminNoteListItemDTO;
import br.com.escreveaqui.backend.dtos.admin.AdminNoteUpdateRequestDTO;
import br.com.escreveaqui.backend.exceptions.AdminNotFoundException;
import br.com.escreveaqui.backend.models.Nota;
import br.com.escreveaqui.backend.repositories.AttachmentRepository;
import br.com.escreveaqui.backend.repositories.NotaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminNotaService {

    private final NotaRepository notaRepository;
    private final AttachmentRepository attachmentRepository;
    private final AttachmentService attachmentService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<AdminNoteListItemDTO> listAll() {
        Map<UUID, long[]> attachmentStats = new HashMap<>();
        for (Object[] row : attachmentRepository.countAndSizeByNote()) {
            UUID noteId = (UUID) row[0];
            long count = ((Number) row[1]).longValue();
            long size = ((Number) row[2]).longValue();
            attachmentStats.put(noteId, new long[]{count, size});
        }

        return notaRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(nota -> toListItem(nota, attachmentStats.getOrDefault(nota.getId(), new long[]{0, 0})))
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
        long fileCount = attachmentRepository.countByNotaIdAndFolderFalse(nota.getId());
        long totalSize = attachmentRepository.sumSizeBytesByNotaId(nota.getId());
        return toListItem(nota, new long[]{fileCount, totalSize});
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

    private AdminNoteListItemDTO toListItem(Nota nota, long[] stats) {
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
                NoteExpiration.isExpired(nota),
                stats[0],
                stats[1]
        );
    }
}

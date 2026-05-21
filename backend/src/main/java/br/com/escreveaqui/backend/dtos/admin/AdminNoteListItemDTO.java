package br.com.escreveaqui.backend.dtos.admin;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminNoteListItemDTO(
        UUID id,
        String slug,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String createdClientIp,
        String lastClientIp,
        Long ttlMinutes,
        OffsetDateTime expiresAt,
        boolean isProtected,
        boolean expired
) {}

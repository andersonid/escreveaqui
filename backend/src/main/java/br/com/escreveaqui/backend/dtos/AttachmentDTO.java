package br.com.escreveaqui.backend.dtos;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AttachmentDTO(
        UUID id,
        String displayName,
        String virtualPath,
        Long sizeBytes,
        String contentType,
        boolean folder,
        OffsetDateTime createdAt
) {}

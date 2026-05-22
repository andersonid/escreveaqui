package br.com.escreveaqui.backend.dtos;

import java.util.UUID;

public record UploadUrlResponseDTO(
        UUID attachmentId,
        String uploadUrl,
        String s3Key,
        long expiresInSeconds
) {}

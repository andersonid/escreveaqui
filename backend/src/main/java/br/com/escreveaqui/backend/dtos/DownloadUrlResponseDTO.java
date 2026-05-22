package br.com.escreveaqui.backend.dtos;

public record DownloadUrlResponseDTO(
        String downloadUrl,
        long expiresInSeconds
) {}

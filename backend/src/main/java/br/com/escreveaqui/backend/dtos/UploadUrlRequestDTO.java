package br.com.escreveaqui.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record UploadUrlRequestDTO(
        @NotBlank String fileName,
        @Positive Long fileSize,
        String contentType,
        String folder
) {}

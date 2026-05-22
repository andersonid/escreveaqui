package br.com.escreveaqui.backend.dtos;

import jakarta.validation.constraints.NotBlank;

public record CreateFolderRequestDTO(
        @NotBlank String name,
        String parentFolder
) {}

package br.com.escreveaqui.backend.dtos.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminChangePasswordRequestDTO(
        @NotBlank @Size(min = 4, max = 128) String currentPassword,
        @NotBlank @Size(min = 4, max = 128) String newPassword
) {}

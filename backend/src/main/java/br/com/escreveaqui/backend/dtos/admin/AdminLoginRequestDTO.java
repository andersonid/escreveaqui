package br.com.escreveaqui.backend.dtos.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminLoginRequestDTO(
        @NotBlank @Size(max = 64) String username,
        @NotBlank @Size(min = 4, max = 128) String password
) {}

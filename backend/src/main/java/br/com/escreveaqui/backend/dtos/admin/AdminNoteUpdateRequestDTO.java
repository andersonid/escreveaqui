package br.com.escreveaqui.backend.dtos.admin;

import jakarta.validation.constraints.Pattern;

public record AdminNoteUpdateRequestDTO(
        Long ttlMinutes,
        Boolean configureExpiration,
        @Pattern(regexp = "^$|^.{4,64}$", message = "Token deve ter entre 4 e 64 caracteres")
        String accessToken
) {}

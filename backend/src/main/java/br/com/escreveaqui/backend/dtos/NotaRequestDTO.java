package br.com.escreveaqui.backend.dtos;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record NotaRequestDTO(
        @Size(max = 1000000, message = "Conteúdo muito extenso para Markdown (limite 1MB)")
        String content,
        Long ttlMinutes,
        Boolean configureExpiration,
        /** Vazio remove proteção; null não altera senha; 4–64 caracteres define ou troca senha. */
        @Pattern(regexp = "^$|^.{4,64}$", message = "Token deve ter entre 4 e 64 caracteres")
        String accessToken
) {}

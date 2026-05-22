package br.com.escreveaqui.backend.controllers;

import br.com.escreveaqui.backend.dtos.NotaRequestDTO;
import br.com.escreveaqui.backend.dtos.NotaResponseDTO;
import br.com.escreveaqui.backend.services.ReadNotaService;
import br.com.escreveaqui.backend.services.UpsertNotaService;
import br.com.escreveaqui.backend.support.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Notas", description = "Leitura e gravação de notas por slug (público com link)")
@RestController
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
@Validated
public class NotaController {

    private final ReadNotaService readService;
    private final UpsertNotaService upsertService;
    private final ClientIpResolver clientIpResolver;

    private static final String SLUG_REGEX = "^[A-Za-z0-9_\\s-]+$";

    @Operation(
            summary = "Ler nota",
            description = "Retorna conteúdo e metadados (expiração, proteção). Slug inexistente → content vazio.",
            responses = @ApiResponse(responseCode = "200", description = "Nota encontrada ou slug novo")
    )
    @GetMapping(value = "/{slug}", produces = "application/json")
    public ResponseEntity<NotaResponseDTO> read(
            @PathVariable @Pattern(regexp = SLUG_REGEX) String slug,
            @Parameter(in = ParameterIn.HEADER, description = "Senha da nota, se protegida")
            @RequestHeader(value = "X-Note-Token", required = false) String token
    ) {
        return ResponseEntity.ok(readService.execute(slug, token));
    }

    @Operation(
            summary = "Criar ou atualizar nota",
            description = """
                    Grava conteúdo e, opcionalmente, configura expiração (configureExpiration + ttlMinutes)
                    e senha (accessToken: vazio remove, omitido não altera).
                    """,
            responses = {
                    @ApiResponse(responseCode = "204", description = "Salvo"),
                    @ApiResponse(responseCode = "403", description = "Nota protegida — token inválido", content = @Content)
            }
    )
    @PutMapping(value = "/{slug}", consumes = "application/json")
    public ResponseEntity<Void> upsert(
            @PathVariable @Pattern(regexp = SLUG_REGEX) String slug,
            @RequestBody @Valid NotaRequestDTO request,
            @Parameter(in = ParameterIn.HEADER, description = "Senha atual, obrigatória se a nota já está protegida")
            @RequestHeader(value = "X-Note-Token", required = false) String token,
            HttpServletRequest httpRequest
    ) {
        upsertService.execute(
                slug,
                request.content(),
                request.ttlMinutes(),
                Boolean.TRUE.equals(request.configureExpiration()),
                request.accessToken(),
                token,
                clientIpResolver.resolve(httpRequest)
        );
        return ResponseEntity.noContent().build();
    }
}

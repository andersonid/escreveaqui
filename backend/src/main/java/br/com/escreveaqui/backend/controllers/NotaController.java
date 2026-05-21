package br.com.escreveaqui.backend.controllers;

import br.com.escreveaqui.backend.dtos.NotaRequestDTO;
import br.com.escreveaqui.backend.dtos.NotaResponseDTO;
import br.com.escreveaqui.backend.services.ReadNotaService;
import br.com.escreveaqui.backend.services.UpsertNotaService;
import br.com.escreveaqui.backend.support.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
@Validated
public class NotaController {

    private final ReadNotaService readService;
    private final UpsertNotaService upsertService;
    private final ClientIpResolver clientIpResolver;

    private static final String SLUG_REGEX = "^[A-Za-z0-9_\\s-]+$";

    @GetMapping(value = "/{slug}", produces = "application/json")
    public ResponseEntity<NotaResponseDTO> read(
            @PathVariable @Pattern(regexp = SLUG_REGEX) String slug,
            @RequestHeader(value = "X-Note-Token", required = false) String token
    ) {
        return ResponseEntity.ok(readService.execute(slug, token));
    }

    @PutMapping(value = "/{slug}", consumes = "application/json")
    public ResponseEntity<Void> upsert(
            @PathVariable @Pattern(regexp = SLUG_REGEX) String slug,
            @RequestBody @Valid NotaRequestDTO request,
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

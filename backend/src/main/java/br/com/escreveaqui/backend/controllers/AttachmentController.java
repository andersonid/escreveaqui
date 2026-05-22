package br.com.escreveaqui.backend.controllers;

import br.com.escreveaqui.backend.dtos.*;
import br.com.escreveaqui.backend.services.AttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Anexos", description = "Gerenciamento de arquivos anexados a notas")
@RestController
@RequestMapping("/api/v1/notes/{slug}/attachments")
@RequiredArgsConstructor
@Validated
public class AttachmentController {

    private final AttachmentService attachmentService;

    @Operation(
            summary = "Listar anexos",
            description = "Lista arquivos e pastas no nível especificado. Use 'prefix' para navegar dentro de pastas.",
            responses = @ApiResponse(responseCode = "200", description = "Lista de anexos")
    )
    @GetMapping(produces = "application/json")
    public ResponseEntity<List<AttachmentDTO>> list(
            @PathVariable String slug,
            @Parameter(in = ParameterIn.HEADER, description = "Senha da nota, se protegida")
            @RequestHeader(value = "X-Note-Token", required = false) String token,
            @RequestParam(defaultValue = "") String prefix
    ) {
        return ResponseEntity.ok(attachmentService.list(slug, token, prefix));
    }

    @Operation(
            summary = "Gerar URL de upload",
            description = "Retorna URL presigned para upload direto ao S3. Limite: 5 GB por arquivo.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "URL gerada"),
                    @ApiResponse(responseCode = "400", description = "Arquivo excede limite")
            }
    )
    @PostMapping(value = "/upload-url", consumes = "application/json", produces = "application/json")
    public ResponseEntity<UploadUrlResponseDTO> uploadUrl(
            @PathVariable String slug,
            @Parameter(in = ParameterIn.HEADER, description = "Senha da nota, se protegida")
            @RequestHeader(value = "X-Note-Token", required = false) String token,
            @RequestBody @Valid UploadUrlRequestDTO request
    ) {
        return ResponseEntity.ok(attachmentService.generateUploadUrl(slug, token, request));
    }

    @Operation(
            summary = "Gerar URL de download",
            description = "Retorna URL presigned para download direto do S3.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "URL gerada"),
                    @ApiResponse(responseCode = "404", description = "Anexo não encontrado")
            }
    )
    @GetMapping(value = "/{attachmentId}/download-url", produces = "application/json")
    public ResponseEntity<DownloadUrlResponseDTO> downloadUrl(
            @PathVariable String slug,
            @Parameter(in = ParameterIn.HEADER, description = "Senha da nota, se protegida")
            @RequestHeader(value = "X-Note-Token", required = false) String token,
            @PathVariable UUID attachmentId
    ) {
        return ResponseEntity.ok(attachmentService.generateDownloadUrl(slug, token, attachmentId));
    }

    @Operation(
            summary = "Criar pasta",
            description = "Cria uma pasta virtual dentro do espaço de anexos da nota.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Pasta criada"),
                    @ApiResponse(responseCode = "400", description = "Pasta já existe ou nome inválido")
            }
    )
    @PostMapping(value = "/folder", consumes = "application/json", produces = "application/json")
    public ResponseEntity<AttachmentDTO> createFolder(
            @PathVariable String slug,
            @Parameter(in = ParameterIn.HEADER, description = "Senha da nota, se protegida")
            @RequestHeader(value = "X-Note-Token", required = false) String token,
            @RequestBody @Valid CreateFolderRequestDTO request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attachmentService.createFolder(slug, token, request));
    }

    @Operation(
            summary = "Remover anexo ou pasta",
            description = "Remove um arquivo ou pasta (com todo conteúdo recursivo) do S3 e banco de dados.",
            responses = {
                    @ApiResponse(responseCode = "204", description = "Removido"),
                    @ApiResponse(responseCode = "404", description = "Anexo não encontrado")
            }
    )
    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> delete(
            @PathVariable String slug,
            @Parameter(in = ParameterIn.HEADER, description = "Senha da nota, se protegida")
            @RequestHeader(value = "X-Note-Token", required = false) String token,
            @PathVariable UUID attachmentId
    ) {
        attachmentService.delete(slug, token, attachmentId);
        return ResponseEntity.noContent().build();
    }
}

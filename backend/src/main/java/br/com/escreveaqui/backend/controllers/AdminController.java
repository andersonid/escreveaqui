package br.com.escreveaqui.backend.controllers;

import br.com.escreveaqui.backend.dtos.admin.*;
import br.com.escreveaqui.backend.services.AdminAuthService;
import br.com.escreveaqui.backend.services.AdminNotaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Validated
public class AdminController {

    private static final String SLUG_REGEX = "^[A-Za-z0-9_\\s-]+$";

    private final AdminAuthService adminAuthService;
    private final AdminNotaService adminNotaService;

    @PostMapping("/login")
    public ResponseEntity<AdminLoginResponseDTO> login(@RequestBody @Valid AdminLoginRequestDTO request) {
        return ResponseEntity.ok(adminAuthService.login(request));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            @RequestHeader("Authorization") String authorization,
            @RequestBody @Valid AdminChangePasswordRequestDTO request
    ) {
        adminAuthService.changePassword(authorization, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notes")
    public ResponseEntity<List<AdminNoteListItemDTO>> listNotes(
            @RequestHeader("Authorization") String authorization
    ) {
        adminAuthService.requireUsername(authorization);
        return ResponseEntity.ok(adminNotaService.listAll());
    }

    @PutMapping("/notes/{slug}")
    public ResponseEntity<AdminNoteListItemDTO> updateNote(
            @RequestHeader("Authorization") String authorization,
            @PathVariable @Pattern(regexp = SLUG_REGEX) String slug,
            @RequestBody @Valid AdminNoteUpdateRequestDTO request
    ) {
        adminAuthService.requireUsername(authorization);
        return ResponseEntity.ok(adminNotaService.updateSettings(slug, request));
    }

    @DeleteMapping("/notes/{slug}")
    public ResponseEntity<Void> deleteNote(
            @RequestHeader("Authorization") String authorization,
            @PathVariable @Pattern(regexp = SLUG_REGEX) String slug
    ) {
        adminAuthService.requireUsername(authorization);
        adminNotaService.deleteBySlug(slug);
        return ResponseEntity.noContent().build();
    }
}

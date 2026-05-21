package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.admin.AdminSessionStore;
import br.com.escreveaqui.backend.dtos.admin.AdminChangePasswordRequestDTO;
import br.com.escreveaqui.backend.dtos.admin.AdminLoginRequestDTO;
import br.com.escreveaqui.backend.dtos.admin.AdminLoginResponseDTO;
import br.com.escreveaqui.backend.exceptions.AdminNotFoundException;
import br.com.escreveaqui.backend.exceptions.AdminUnauthorizedException;
import br.com.escreveaqui.backend.models.AdminCredential;
import br.com.escreveaqui.backend.repositories.AdminCredentialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminCredentialRepository adminCredentialRepository;
    private final AdminSessionStore sessionStore;
    private final PasswordEncoder passwordEncoder;

    public AdminLoginResponseDTO login(AdminLoginRequestDTO request) {
        AdminCredential admin = adminCredentialRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new AdminUnauthorizedException());

        if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
            throw new AdminUnauthorizedException();
        }

        String token = sessionStore.createSession(admin.getUsername());
        return new AdminLoginResponseDTO(token, admin.getUsername());
    }

    public String requireUsername(String bearerToken) {
        String token = extractBearer(bearerToken);
        return sessionStore.resolveUsername(token)
                .orElseThrow(AdminUnauthorizedException::new);
    }

    @Transactional
    public void changePassword(String bearerToken, AdminChangePasswordRequestDTO request) {
        String username = requireUsername(bearerToken);
        AdminCredential admin = adminCredentialRepository.findByUsername(username)
                .orElseThrow(() -> new AdminNotFoundException("Administrador não encontrado"));

        if (!passwordEncoder.matches(request.currentPassword(), admin.getPasswordHash())) {
            throw new AdminUnauthorizedException();
        }

        admin.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        adminCredentialRepository.save(admin);
        sessionStore.invalidate(extractBearer(bearerToken));
    }

    private static String extractBearer(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AdminUnauthorizedException();
        }
        String token = authorization.substring(7).trim();
        if (token.isEmpty()) {
            throw new AdminUnauthorizedException();
        }
        return token;
    }
}

package br.com.escreveaqui.backend.configs;

import br.com.escreveaqui.backend.models.AdminCredential;
import br.com.escreveaqui.backend.repositories.AdminCredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminDataInitializer implements ApplicationRunner {

    private final AdminCredentialRepository adminCredentialRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (adminCredentialRepository.count() > 0) {
            return;
        }
        adminCredentialRepository.save(
                AdminCredential.builder()
                        .username("anobre")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .build()
        );
        log.warn("Credencial admin inicial criada (usuário anobre). Altere a senha em /admin.");
    }
}

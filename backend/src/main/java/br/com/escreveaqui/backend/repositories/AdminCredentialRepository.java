package br.com.escreveaqui.backend.repositories;

import br.com.escreveaqui.backend.models.AdminCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AdminCredentialRepository extends JpaRepository<AdminCredential, UUID> {

    Optional<AdminCredential> findByUsername(String username);
}

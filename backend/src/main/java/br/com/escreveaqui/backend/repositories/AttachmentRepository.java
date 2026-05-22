package br.com.escreveaqui.backend.repositories;

import br.com.escreveaqui.backend.models.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {

    List<Attachment> findByNotaIdAndVirtualPathStartingWithAndFolder(
            UUID noteId, String prefix, boolean isFolder);

    List<Attachment> findByNotaIdAndVirtualPathStartingWith(UUID noteId, String prefix);

    List<Attachment> findByNotaId(UUID noteId);

    Optional<Attachment> findByNotaIdAndId(UUID noteId, UUID attachmentId);

    Optional<Attachment> findByNotaIdAndS3Key(UUID noteId, String s3Key);

    long countByNotaIdAndFolderFalse(UUID noteId);
}

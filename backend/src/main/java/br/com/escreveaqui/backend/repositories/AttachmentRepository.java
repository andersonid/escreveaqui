package br.com.escreveaqui.backend.repositories;

import br.com.escreveaqui.backend.models.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {

    @Query("SELECT a.nota.id, COUNT(a), COALESCE(SUM(a.sizeBytes), 0) " +
            "FROM Attachment a WHERE a.folder = false GROUP BY a.nota.id")
    List<Object[]> countAndSizeByNote();

    List<Attachment> findByNotaIdAndVirtualPathStartingWithAndFolder(
            UUID noteId, String prefix, boolean isFolder);

    List<Attachment> findByNotaIdAndVirtualPathStartingWith(UUID noteId, String prefix);

    List<Attachment> findByNotaId(UUID noteId);

    Optional<Attachment> findByNotaIdAndId(UUID noteId, UUID attachmentId);

    Optional<Attachment> findByNotaIdAndS3Key(UUID noteId, String s3Key);

    long countByNotaIdAndFolderFalse(UUID noteId);

    @Query("SELECT COALESCE(SUM(a.sizeBytes), 0) FROM Attachment a WHERE a.nota.id = :noteId AND a.folder = false")
    long sumSizeBytesByNotaId(UUID noteId);
}

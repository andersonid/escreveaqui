package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.dtos.*;
import br.com.escreveaqui.backend.exceptions.NoteAccessDeniedException;
import br.com.escreveaqui.backend.models.Attachment;
import br.com.escreveaqui.backend.models.Nota;
import br.com.escreveaqui.backend.repositories.AttachmentRepository;
import br.com.escreveaqui.backend.repositories.NotaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AttachmentService {

    private final NotaRepository notaRepository;
    private final AttachmentRepository attachmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final long presignedTtlMinutes;
    private final long maxFileSizeBytes;

    public AttachmentService(
            NotaRepository notaRepository,
            AttachmentRepository attachmentRepository,
            PasswordEncoder passwordEncoder,
            S3Client s3Client,
            S3Presigner s3Presigner,
            @Value("${escreveaqui.s3.bucket}") String bucket,
            @Value("${escreveaqui.s3.presigned-ttl-minutes}") long presignedTtlMinutes,
            @Value("${escreveaqui.s3.max-file-size-bytes}") long maxFileSizeBytes) {
        this.notaRepository = notaRepository;
        this.attachmentRepository = attachmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucket = bucket;
        this.presignedTtlMinutes = presignedTtlMinutes;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @Transactional(readOnly = true)
    public List<AttachmentDTO> list(String slug, String token, String prefix) {
        Nota nota = resolveAndAuthorize(slug, token);
        String normalizedPrefix = normalizePrefix(prefix);

        List<Attachment> all = attachmentRepository.findByNotaIdAndVirtualPathStartingWith(
                nota.getId(), normalizedPrefix);

        Set<String> immediateItems = new LinkedHashSet<>();
        List<AttachmentDTO> result = new ArrayList<>();

        for (Attachment att : all) {
            String relativePath = att.getVirtualPath().substring(normalizedPrefix.length());

            if (att.isFolder() && att.getVirtualPath().equals(normalizedPrefix + att.getDisplayName() + "/")) {
                result.add(toDTO(att));
                immediateItems.add(att.getDisplayName());
                continue;
            }

            int slashIdx = relativePath.indexOf('/');
            if (slashIdx == -1) {
                result.add(toDTO(att));
            } else {
                String folderName = relativePath.substring(0, slashIdx);
                if (immediateItems.add(folderName)) {
                    var folderAtt = attachmentRepository.findByNotaIdAndS3Key(
                            nota.getId(), buildS3Key(nota.getId(), normalizedPrefix + folderName + "/"));
                    folderAtt.ifPresent(a -> result.add(toDTO(a)));
                }
            }
        }

        result.sort((a, b) -> {
            if (a.folder() != b.folder()) return a.folder() ? -1 : 1;
            return a.displayName().compareToIgnoreCase(b.displayName());
        });

        return result;
    }

    @Transactional
    public UploadUrlResponseDTO generateUploadUrl(String slug, String token, UploadUrlRequestDTO request) {
        Nota nota = resolveAndAuthorize(slug, token);

        if (request.fileSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException(
                    "Arquivo excede o limite de " + (maxFileSizeBytes / (1024 * 1024)) + " MB");
        }

        String folder = normalizePrefix(request.folder());
        String virtualPath = folder + request.fileName();
        String s3Key = buildS3Key(nota.getId(), virtualPath);

        String resolvedContentType = request.contentType() != null ? request.contentType() : "application/octet-stream";

        Attachment attachment = Attachment.builder()
                .nota(nota)
                .s3Key(s3Key)
                .displayName(request.fileName())
                .virtualPath(virtualPath)
                .sizeBytes(request.fileSize())
                .contentType(resolvedContentType)
                .folder(false)
                .build();
        Attachment saved = attachmentRepository.save(attachment);

        Duration ttl = Duration.ofMinutes(presignedTtlMinutes);
        var presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .putObjectRequest(b -> b.bucket(bucket).key(s3Key)
                        .contentType(resolvedContentType))
                .build();

        String uploadUrl = s3Presigner.presignPutObject(presignRequest).url().toString();

        log.info("Presigned upload URL gerada: slug='{}', file='{}', size={}",
                slug, request.fileName(), request.fileSize());

        return new UploadUrlResponseDTO(
                saved.getId(),
                uploadUrl,
                s3Key,
                ttl.toSeconds());
    }

    @Transactional(readOnly = true)
    public DownloadUrlResponseDTO generateDownloadUrl(String slug, String token, UUID attachmentId) {
        Nota nota = resolveAndAuthorize(slug, token);

        Attachment attachment = attachmentRepository.findByNotaIdAndId(nota.getId(), attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Anexo não encontrado"));

        if (attachment.isFolder()) {
            throw new IllegalArgumentException("Não é possível baixar uma pasta");
        }

        Duration ttl = Duration.ofMinutes(presignedTtlMinutes);
        var presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(b -> b.bucket(bucket).key(attachment.getS3Key())
                        .responseContentDisposition("attachment; filename=\"" + attachment.getDisplayName() + "\""))
                .build();

        String downloadUrl = s3Presigner.presignGetObject(presignRequest).url().toString();

        return new DownloadUrlResponseDTO(downloadUrl, ttl.toSeconds());
    }

    @Transactional
    public AttachmentDTO createFolder(String slug, String token, CreateFolderRequestDTO request) {
        Nota nota = resolveAndAuthorize(slug, token);

        String parentFolder = normalizePrefix(request.parentFolder());
        String folderName = request.name().trim().replaceAll("[/\\\\]", "");
        if (folderName.isBlank()) {
            throw new IllegalArgumentException("Nome de pasta inválido");
        }

        String virtualPath = parentFolder + folderName + "/";
        String s3Key = buildS3Key(nota.getId(), virtualPath);

        var existing = attachmentRepository.findByNotaIdAndS3Key(nota.getId(), s3Key);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Pasta já existe");
        }

        s3Client.putObject(
                PutObjectRequest.builder().bucket(bucket).key(s3Key)
                        .contentLength(0L).contentType("application/x-directory").build(),
                software.amazon.awssdk.core.sync.RequestBody.empty());

        Attachment folder = Attachment.builder()
                .nota(nota)
                .s3Key(s3Key)
                .displayName(folderName)
                .virtualPath(virtualPath)
                .sizeBytes(0L)
                .contentType("application/x-directory")
                .folder(true)
                .build();
        folder = attachmentRepository.save(folder);

        log.info("Pasta criada: slug='{}', path='{}'", slug, virtualPath);
        return toDTO(folder);
    }

    @Transactional
    public void delete(String slug, String token, UUID attachmentId) {
        Nota nota = resolveAndAuthorize(slug, token);

        Attachment attachment = attachmentRepository.findByNotaIdAndId(nota.getId(), attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Anexo não encontrado"));

        if (attachment.isFolder()) {
            deleteFolder(nota.getId(), attachment);
        } else {
            deleteS3Object(attachment.getS3Key());
            attachmentRepository.delete(attachment);
        }

        log.info("Anexo removido: slug='{}', file='{}'", slug, attachment.getDisplayName());
    }

    public void purgeAllForNote(UUID noteId) {
        List<Attachment> attachments = attachmentRepository.findByNotaId(noteId);
        if (attachments.isEmpty()) return;

        List<ObjectIdentifier> keys = attachments.stream()
                .map(a -> ObjectIdentifier.builder().key(a.getS3Key()).build())
                .toList();

        // S3 batch delete (max 1000 per request)
        for (int i = 0; i < keys.size(); i += 1000) {
            List<ObjectIdentifier> batch = keys.subList(i, Math.min(i + 1000, keys.size()));
            s3Client.deleteObjects(DeleteObjectsRequest.builder()
                    .bucket(bucket)
                    .delete(Delete.builder().objects(batch).build())
                    .build());
        }

        attachmentRepository.deleteAll(attachments);
        log.info("Purgados {} anexo(s) da nota {}", attachments.size(), noteId);
    }

    private void deleteFolder(UUID noteId, Attachment folderAttachment) {
        String prefix = folderAttachment.getVirtualPath();
        List<Attachment> children = attachmentRepository.findByNotaIdAndVirtualPathStartingWith(noteId, prefix);

        List<ObjectIdentifier> keys = children.stream()
                .map(a -> ObjectIdentifier.builder().key(a.getS3Key()).build())
                .collect(Collectors.toList());

        if (!keys.isEmpty()) {
            s3Client.deleteObjects(DeleteObjectsRequest.builder()
                    .bucket(bucket)
                    .delete(Delete.builder().objects(keys).build())
                    .build());
        }

        attachmentRepository.deleteAll(children);
    }

    private Nota resolveAndAuthorize(String slug, String token) {
        String safeSlug = UpsertNotaService.makeSlug(slug);
        Nota nota = notaRepository.findBySlug(safeSlug)
                .orElseThrow(() -> new IllegalArgumentException("Nota não encontrada"));

        if (NoteExpiration.isExpired(nota)) {
            throw new IllegalArgumentException("Nota expirada");
        }

        if (nota.isProtected()) {
            if (token == null || !passwordEncoder.matches(token, nota.getAccessTokenHash())) {
                throw new NoteAccessDeniedException();
            }
        }

        return nota;
    }

    private String buildS3Key(UUID noteId, String virtualPath) {
        return "notes/" + noteId + "/" + virtualPath;
    }

    private String normalizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) return "";
        String p = prefix.trim();
        if (!p.endsWith("/")) p += "/";
        if (p.startsWith("/")) p = p.substring(1);
        return p;
    }

    private void deleteS3Object(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    private AttachmentDTO toDTO(Attachment a) {
        return new AttachmentDTO(
                a.getId(),
                a.getDisplayName(),
                a.getVirtualPath(),
                a.getSizeBytes(),
                a.getContentType(),
                a.isFolder(),
                a.getCreatedAt());
    }
}

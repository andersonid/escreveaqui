package br.com.escreveaqui.backend.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attachments", indexes = {
        @Index(name = "idx_attachment_note_id", columnList = "note_id"),
        @Index(name = "idx_attachment_s3_key", columnList = "s3Key")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "note_id", nullable = false)
    private Nota nota;

    @Column(nullable = false, length = 1024)
    private String s3Key;

    @Column(nullable = false, length = 512)
    private String displayName;

    @Column(nullable = false, length = 1024)
    private String virtualPath;

    @Column(nullable = false)
    private Long sizeBytes;

    @Column(length = 255)
    private String contentType;

    @Column(nullable = false)
    private boolean folder;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

package br.com.escreveaqui.backend.services;

import br.com.escreveaqui.backend.models.Nota;

import java.time.OffsetDateTime;

final class NoteExpiration {

    private NoteExpiration() {}

    static boolean isExpired(Nota nota) {
        OffsetDateTime expiresAt = nota.getExpiresAt();
        return expiresAt != null && expiresAt.isBefore(OffsetDateTime.now());
    }

    static boolean hasInactivityTtl(Nota nota) {
        Long ttlMinutes = nota.getTtlMinutes();
        return ttlMinutes != null && ttlMinutes > 0;
    }

    static void applyPolicy(Nota nota, Long ttlMinutes) {
        if (ttlMinutes != null && ttlMinutes > 0) {
            nota.setTtlMinutes(ttlMinutes);
            nota.setExpiresAt(OffsetDateTime.now().plusMinutes(ttlMinutes));
            return;
        }
        nota.setTtlMinutes(null);
        nota.setExpiresAt(null);
    }

    static void renewOnActivity(Nota nota) {
        if (!hasInactivityTtl(nota)) {
            return;
        }
        nota.setExpiresAt(OffsetDateTime.now().plusMinutes(nota.getTtlMinutes()));
    }
}

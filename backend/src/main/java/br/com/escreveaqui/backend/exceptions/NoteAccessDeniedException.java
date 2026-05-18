package br.com.escreveaqui.backend.exceptions;

public class NoteAccessDeniedException extends RuntimeException {

    public NoteAccessDeniedException() {
        super("Token de acesso inválido ou ausente");
    }
}

package br.com.escreveaqui.backend.exceptions;

public class AdminUnauthorizedException extends RuntimeException {

    public AdminUnauthorizedException() {
        super("Não autorizado");
    }
}

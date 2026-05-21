package br.com.escreveaqui.backend.filters;

import br.com.escreveaqui.backend.admin.AdminSessionStore;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class AdminAuthFilter extends OncePerRequestFilter {

    public static final String ADMIN_USERNAME_ATTR = "adminUsername";

    private final AdminSessionStore sessionStore;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/v1/admin")) {
            return true;
        }
        return path.equals("/api/v1/admin/login");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Não autorizado");
            return;
        }
        String token = auth.substring(7).trim();
        var username = sessionStore.resolveUsername(token);
        if (username.isEmpty()) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Não autorizado");
            return;
        }
        request.setAttribute(ADMIN_USERNAME_ATTR, username.get());
        filterChain.doFilter(request, response);
    }
}

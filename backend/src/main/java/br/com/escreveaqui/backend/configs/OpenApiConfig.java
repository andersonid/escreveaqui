package br.com.escreveaqui.backend.configs;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI escreveAquiOpenAPI(
            @Value("${escreveaqui.public-url:https://escreveaqui.nobre.ninja}") String publicUrl
    ) {
        return new OpenAPI()
                .info(new Info()
                        .title("EscreveAqui API")
                        .version("v1")
                        .description("""
                                API REST do editor colaborativo EscreveAqui.
                                Notas são identificadas por slug na URL pública.
                                Configuração (expiração, senha) vai no PUT junto com o conteúdo.
                                """)
                        .contact(new Contact().name("EscreveAqui").url(publicUrl)))
                .servers(List.of(new Server().url(publicUrl).description("Produção")));
    }
}

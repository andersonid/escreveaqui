package br.com.escreveaqui.backend.configs;

import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import org.springdoc.ai.customizers.McpToolCustomizer;
import org.springdoc.ai.customizers.McpToolDefinitionContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Garante que endpoints admin não viram tools MCP (além de paths-to-exclude). */
@Configuration
public class McpToolFilterConfig {

    @Bean
    public McpToolCustomizer excludeAdminApiTools() {
        return (McpToolDefinitionContext context, String path, PathItem.HttpMethod method, Operation operation) -> {
            if (path != null && path.startsWith("/api/v1/admin")) {
                context.setExclude(true);
            }
            return context;
        };
    }
}

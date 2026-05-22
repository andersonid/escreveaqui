package br.com.escreveaqui.backend.configs;

import java.util.Arrays;
import java.util.List;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.json.jackson.JacksonMcpJsonMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.WebMvcStreamableServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.ai.mcp.McpToolUtils;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

/**
 * Configura o servidor MCP (Streamable HTTP) manualmente porque o
 * spring-ai-starter-mcp-server-webmvc foi compilado para Boot 3.5.x
 * e não é compatível com Boot 4.0.x. O springdoc MCP fornece os
 * ToolCallbackProviders mas não cria o servidor nem o transport.
 */
@Configuration
public class McpServerConfig {

    @Bean
    WebMvcStreamableServerTransportProvider mcpTransportProvider(
            @Value("${springdoc.ai.mcp.mcp-endpoint:/mcp}") String mcpEndpoint) {
        return WebMvcStreamableServerTransportProvider.builder()
                .jsonMapper(new JacksonMcpJsonMapper(
                        new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)))
                .mcpEndpoint(mcpEndpoint)
                .build();
    }

    @Bean
    McpSyncServer mcpSyncServer(
            WebMvcStreamableServerTransportProvider transportProvider,
            List<ToolCallbackProvider> toolCallbackProviders) {

        List<McpServerFeatures.SyncToolSpecification> tools = toolCallbackProviders.stream()
                .map(ToolCallbackProvider::getToolCallbacks)
                .flatMap(Arrays::stream)
                .map(McpToolUtils::toSyncToolSpecification)
                .toList();

        return McpServer.sync(transportProvider)
                .serverInfo("escreveaqui", "1.0.0")
                .capabilities(McpSchema.ServerCapabilities.builder().tools(true).build())
                .tools(tools)
                .build();
    }

    @Bean
    RouterFunction<ServerResponse> mcpRouterFunction(
            WebMvcStreamableServerTransportProvider transportProvider) {
        return transportProvider.getRouterFunction();
    }
}

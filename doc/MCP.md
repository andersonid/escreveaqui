# MCP e documentação OpenAPI — EscreveAqui

## OpenAPI e Swagger UI

Gerados automaticamente pelo [springdoc-openapi](https://springdoc.org/) no backend:

| Recurso | URL (produção) |
|---------|----------------|
| OpenAPI JSON | `https://escreveaqui.nobre.ninja/v3/api-docs` |
| Swagger UI | `https://escreveaqui.nobre.ninja/swagger-ui.html` |

A API pública da aplicação (`/api/v1/notes`) continua acessível **sem** Basic Auth no path `/api`.

## Autenticação (Traefik)

Swagger, OpenAPI e MCP exigem **HTTP Basic Auth** no Ingress (usuário padrão: `api-docs`).

Credencial inicial: gerada ao rodar o script de selagem (uma vez por cluster):

```bash
cd escreveaqui
API_DOCS_AUTH_PASSWORD='sua-senha-forte' ./scripts/seal-api-docs-auth.sh
git add k8s/api-docs-auth-sealed-secret.yaml && git commit -m "chore(k8s): rotacionar basic auth docs/mcp"
```

Para rotacionar, gere nova senha e execute o script de novo; faça commit do `api-docs-auth-sealed-secret.yaml` atualizado.

## MCP (Model Context Protocol)

Endpoint **Streamable HTTP** no mesmo backend:

- URL: `https://escreveaqui.nobre.ninja/mcp`
- Mesmo Basic Auth do Swagger
- Tools geradas a partir do OpenAPI (apenas tag **Notas**; admin excluído)
- Operações mutantes (`PUT`, etc.): guardrail padrão exige aprovação no fluxo MCP (`require-approval-for-mutating-tools=true`)

### Cursor (`~/.cursor/mcp.json` exemplo)

```json
{
  "mcpServers": {
    "escreveaqui": {
      "url": "https://escreveaqui.nobre.ninja/mcp",
      "headers": {
        "Authorization": "Basic BASE64_DE_api-docs:SENHA"
      }
    }
  }
}
```

Gere o Base64: `echo -n 'api-docs:SUA_SENHA' | base64 -w0`

### Configuração no backend

Propriedades em `application.properties`:

- `springdoc.ai.mcp.enabled=true`
- `springdoc.ai.mcp.base-url=http://127.0.0.1:8080` — chamadas HTTP internas do pod
- `springdoc.ai.mcp.paths-to-exclude=/api/v1/admin/**`

## Referência humana

Regras de negócio (slug, expiração, tokens): [API.md](./API.md). Contrato canônico: OpenAPI em `/v3/api-docs`.

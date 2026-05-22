# Documentação da API — EscreveAqui

## Contrato canônico (OpenAPI)

O backend gera o contrato automaticamente com **springdoc-openapi**:

| Ambiente | OpenAPI JSON | Swagger UI |
|----------|--------------|------------|
| Produção | `https://escreveaqui.nobre.ninja/v3/api-docs` | `https://escreveaqui.nobre.ninja/swagger-ui.html` |
| Local | `http://localhost:8080/v3/api-docs` | `http://localhost:8080/swagger-ui.html` |

Em produção, Swagger/OpenAPI/MCP exigem **Basic Auth** no Traefik (ver [MCP.md](./MCP.md)). A API de notas em `/api/v1/notes` permanece pública no Ingress.

---

## Base URL da API de notas

`/api/v1/notes` — prefixo dos endpoints públicos do editor.

---

## Formato do slug

O slug é o identificador único de uma nota — aparece na URL pública (`/{slug}`).

**Validação (entrada):** letras, números, espaços, `-` e `_`. O backend normaliza (minúsculas, sem acentos, espaços → hífens).

| Slug enviado | Slug salvo |
|--------------|------------|
| `Minha Nota` | `minha-nota` |
| `résumé` | `resume` |

---

## GET `/api/v1/notes/{slug}`

Lê conteúdo e metadados da nota.

**Header opcional:** `X-Note-Token` — senha, se a nota estiver protegida.

**Resposta `200`:**

```json
{
  "slug": "minha-nota",
  "content": "Texto",
  "updatedAt": "2025-04-18T14:30:00Z",
  "ttlMinutes": 43200,
  "expiresAt": "2025-05-18T14:30:00Z",
  "isProtected": false,
  "expired": false
}
```

Slug inexistente → `200` com `content` vazio (nota nova no frontend).

---

## PUT `/api/v1/notes/{slug}`

Cria ou atualiza nota (idempotente). Resposta **`204 No Content`**.

**Header opcional:** `X-Note-Token` — obrigatório se a nota já está protegida.

**Corpo JSON:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `content` | string | Texto (máx. 1 MB) |
| `configureExpiration` | boolean | `true` para aplicar/remover política de TTL |
| `ttlMinutes` | number \| null | Com `configureExpiration: true`: minutos até expirar; `null` ou `0` = sem expiração |
| `accessToken` | string \| omitido | `""` remove proteção; `null`/omitido não altera senha; 4–64 chars define/troca senha |

**Exemplo — só conteúdo (autosave):**

```json
{ "content": "Olá" }
```

**Exemplo — expiração 30 dias + senha:**

```json
{
  "content": "Texto",
  "configureExpiration": true,
  "ttlMinutes": 43200,
  "accessToken": "minha-senha-secreta"
}
```

---

## API Admin

Prefixo `/api/v1/admin` — painel `/admin`, Bearer após login. Documentada no Swagger (tag Admin), **excluída** das tools MCP.

---

## Erros (RFC 9457)

| Status | Situação |
|--------|----------|
| `400` | Validação (slug, corpo) |
| `403` | Nota protegida — token inválido |
| `409` | Conflito de versão otimista |
| `500` | Erro interno |

---

## MCP

Agentes IA: endpoint `/mcp` (Streamable HTTP), tools geradas a partir desta API (somente notas). Detalhes: [MCP.md](./MCP.md).

---

## Cache, CORS

- **Cache:** Caffeine nas leituras GET (TTL 30s; invalidação no PUT).
- **CORS:** `ALLOWED_ORIGINS` (produção: `https://escreveaqui.nobre.ninja`).

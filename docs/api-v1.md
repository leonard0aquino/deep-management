# API interna v1

Base local: `/api/v1`. Todas as chamadas exigem:

```http
Authorization: Bearer deep_<chave>
Content-Type: application/json
```

A chave é criada e revogada em **Configurações → API** e só é exibida uma vez.

## Respostas

Sucesso:

```json
{ "data": {}, "meta": { "limit": 50, "offset": 0, "total": 1 } }
```

Erro:

```json
{ "error": { "code": "validation_error", "message": "...", "details": {} } }
```

## Endpoints

### `GET /clients`

Parâmetros: `search`, `limit` (1–100) e `offset`.

### `GET /people`

Parâmetros: `client_id`, `search`, `limit` (1–100) e `offset`.

### `POST /interactions`

```json
{
  "client_id": "uuid",
  "product_id": "uuid",
  "manager_id": "uuid opcional",
  "contact_id": "uuid opcional",
  "interaction_type": "meeting",
  "topic": "Reunião executiva",
  "notes": "Resumo",
  "relevance": 5,
  "occurred_at": "2026-07-28"
}
```

### `POST /actions`

```json
{
  "action_key": "sistema-origem:123",
  "client_id": "uuid",
  "product_id": "uuid",
  "priority": "alta",
  "reason": "Compromisso assumido",
  "due_date": "2026-08-15"
}
```

### `PUT /actions/:id`

Campos editáveis: `priority`, `reason`, `status`, `assigned_to`, `due_date`, `justification` e `result`. Identidade, cliente e produto são imutáveis.

### `GET /health-score`

Parâmetro opcional: `client_id`. Sem filtro, retorna até 500 clientes ordenados pelos menores scores.

### `POST /events`

```json
{
  "source": "erp",
  "event_type": "contract.updated",
  "external_key": "evento-123",
  "payload": { "contract_id": "abc" }
}
```

O par `source + external_key` é idempotente. Reenvios retornam o evento existente com `duplicate: true`.

# Sorteou Ganhou Admin

Sistema administrativo MVP para operar consórcio/sorteio presencial com clientes, automação mock, cotas, pagamentos mock, sorteios e relatórios.

## Stack

- API: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, bcrypt, Zod.
- Web: React, Vite, TypeScript, TailwindCSS, React Router, Axios, React Hook Form.
- Integrações mock: Kommo, WhatsApp e pagamento.

## Estrutura

```txt
api/
  prisma/schema.prisma
  prisma/seed.ts
  src/
    app.ts
    server.ts
    config/
    database/
    middlewares/
    modules/
web/
  src/
    components/
    contexts/
    layouts/
    pages/
    routes/
    services/
```

## Configuração da API

Se você não tiver PostgreSQL local, suba o banco com Docker:

```bash
docker compose up -d db
```

```bash
cd api
npm install
copy .env.example .env
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Edite `api/.env` se o PostgreSQL local usar outro usuário, senha, host ou porta.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sorteou_ganhou"
JWT_SECRET="dev_secret_change_me"
PUBLIC_API_KEY="change_me_public_api_key"
PORT=3333
```

Login inicial:

- Email: `admin@sorteouganhou.com`
- Senha: `admin123`
- Role: `ADMIN`

Troque a senha após o primeiro acesso criando outro usuário admin ou alterando o usuário seedado.

## Configuração do Web

```bash
cd web
npm install
copy .env.example .env
npm run dev
```

O Vite sobe por padrão em `http://localhost:5173`.

```env
VITE_API_URL=http://localhost:3333/api
```

## Rotas principais

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/clients`
- `POST /api/clients/from-landing`
- `POST /api/groups`
- `POST /api/groups/:id/generate-quotas`
- `GET /api/quotas?groupId=...`
- `POST /api/quotas/:id/reserve`
- `POST /api/payments/:id/mark-as-paid`
- `POST /api/draws`
- `POST /api/draws/:id/register-result`
- `POST /api/automation/:clientId/receive-message`
- `POST /api/automation/:clientId/fallback`
- `POST /api/automation/run-pending`
- `GET /api/reports/dashboard`
- `GET /api/reports/draw-eligible/:groupId`
- `GET /api/reports/human-queue`

Todas as rotas administrativas exigem `Authorization: Bearer <token>`. Webhooks mock de Kommo e WhatsApp ficam abertos:

- `POST /api/kommo/webhook`
- `POST /api/whatsapp/webhook`

Rotas públicas para Kommo AI Agent/Salesbot exigem o header `x-api-key` com o valor de `PUBLIC_API_KEY`:

- `GET /api/public/groups/available`
- `GET /api/public/groups/:id/quotas/available`
- `GET /api/public/clients/by-phone/:phone/status`
- `POST /api/public/clients/from-kommo`
- `POST /api/public/quotas/reserve`
- `POST /api/public/payments/create-link`
- `POST /api/public/kommo/action`

## Como conectar com Kommo AI Agent / Salesbot

A Kommo deve usar as rotas `/api/public` para consultar grupos/cotas e executar ações no sistema. Configure o Salesbot/AI Agent para enviar sempre:

```http
x-api-key: change_me_public_api_key
Content-Type: application/json
```

Exemplo para criar ou atualizar cliente:

```json
{
  "name": "Carlos",
  "phone": "27999999999",
  "email": "carlos@email.com",
  "cpf": "00000000000",
  "origin": "KOMMO",
  "kommoContactId": "123",
  "kommoLeadId": "456"
}
```

Envie para `POST /api/public/clients/from-kommo`.

Exemplo para listar cotas disponíveis:

```http
GET /api/public/groups/GROUP_ID/quotas/available
```

Exemplo para reservar cota:

```json
{
  "phone": "27999999999",
  "groupId": "GROUP_ID",
  "quotaNumber": 34,
  "kommoLeadId": "456",
  "kommoContactId": "123"
}
```

Envie para `POST /api/public/quotas/reserve`. A resposta inclui `payment.paymentLink` mock para o agente continuar a conversa.

Exemplo de action genérica para Salesbot:

```json
{
  "action": "RESERVE_QUOTA",
  "phone": "27999999999",
  "payload": {
    "groupId": "GROUP_ID",
    "quotaNumber": 34
  },
  "kommo": {
    "leadId": "456",
    "contactId": "123"
  }
}
```

Envie para `POST /api/public/kommo/action`. Actions suportadas: `CHECK_CLIENT`, `LIST_GROUPS`, `LIST_AVAILABLE_QUOTAS`, `CREATE_OR_UPDATE_CLIENT`, `RESERVE_QUOTA`, `CREATE_PAYMENT_LINK`, `CHECK_PAYMENT_STATUS` e `REQUEST_HUMAN`.

## Fluxo de teste manual

1. Suba API e Web.
2. Acesse `http://localhost:5173`.
3. Faça login com `admin@sorteouganhou.com` / `admin123`.
4. Crie o grupo `Grupo 001 - CG 160 Fan` com 180 cotas e valor 500.
5. Clique em `Gerar cotas`.
6. Crie um cliente ou use `Simular landing page`.
7. Abra `Cotas`, selecione o grupo, clique em uma cota disponível e reserve para o cliente.
8. Abra `Pagamentos` e marque o pagamento gerado como pago.
9. Confirme que a cota vira `ACTIVE` e o cliente vira `PARTICIPANT`.
10. Abra `Sorteios`, crie um sorteio presencial e registre o número da cota ativa.
11. Confirme que o cliente vira `WINNER`.
12. Abra `Relatórios` para validar dashboard, financeiro, funil, aptos e contemplados.
13. Em `Automação`, simule mensagens ou aplique fallbacks.
14. Após 3 fallbacks, o cliente aparece em `Fila Humana`.

## O que está mockado

- Kommo: cria lead, atualiza status, adiciona nota e cria tarefa gravando `KommoEvent` e histórico de conversa.
- WhatsApp: envia e recebe mensagens gravando `ConversationMessage`.
- Pagamento: gera link mock e confirma pagamento manualmente pelo painel.

## Próximos passos de integração

- Kommo real: substituir `KommoService` por client HTTP autenticado e mapear pipelines/status reais.
- WhatsApp real: conectar provider oficial ou BSP, validar assinatura do webhook e normalizar telefones.
- Pagamento real: integrar gateway, trocar link mock por checkout real e confirmar pagamento por webhook assinado.
- Operação: adicionar permissões finas por role, auditoria exportável e jobs de cobrança/overdue.

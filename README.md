# TWR Postback Receiver

API REST desenvolvida em Node.js e TypeScript para receber, validar e processar notificações de vendas por webhooks, mantendo o estado das vendas e um histórico dos eventos recebidos.

## 1. Como chamar a API

**URL base:** https://twr-postback-receiver-8ikx.onrender.com

### Consultar vendas (`GET`)

Para listar as vendas com paginação, envie uma requisição `GET` para:

```http
https://twr-postback-receiver-8ikx.onrender.com/sales?page=1&limit=10
```

No Postman:
1. Selecione o método `GET`.
2. Insira a URL acima.
3. Clique em **Send**.

Os parâmetros `page` e `limit` são opcionais. Os valores padrão são `page=1` e `limit=10`, com limite máximo de 100 vendas por página.

Para consultar o resumo agregado, utilize:

```http
https://twr-postback-receiver-8ikx.onrender.com/sales/summary
```

Esse endpoint retorna a quantidade total de vendas, a quantidade por status e a soma dos valores das vendas aprovadas agrupada por moeda. Os valores de moedas diferentes não são convertidos nem somados entre si.

### Enviar um postback (`POST`)

O endpoint de recebimento de vendas exige uma assinatura HMAC-SHA256 no header `x-webhook-signature`. Para facilitar os testes, o Postman pode gerar essa assinatura automaticamente antes de cada requisição.

**URL:**

```http
https://twr-postback-receiver-8ikx.onrender.com/webhooks/sales
```

#### Passo 1 — Configurar o segredo

O segredo compartilhado usado para validar as assinaturas é configurado no servidor pela variável `WEBHOOK_SECRET`. O segredo será compartilhado de modo privado, sem que ele seja publicado no repositório.

No Postman, recomenda-se criar uma variável de ambiente chamada `webhook_secret`:

1. Abra **Environments** e crie ou selecione um ambiente.
2. Adicione uma variável com o nome `webhook_secret`.
3. Informe o segredo fornecido para a avaliação como valor da variável.
4. Selecione esse ambiente antes de executar a requisição.

O valor precisa corresponder exatamente ao `WEBHOOK_SECRET` configurado no servidor.

Embora seja possível inserir o segredo diretamente no script do Postman, utilizar uma variável de ambiente é recomendado para separar as credenciais do código e reduzir o risco de compartilhamento acidental.

#### Passo 2 — Configurar o corpo da requisição

Crie uma requisição `POST` para a URL indicada acima.

Na aba **Headers**, adicione:

| Key | Value |
|---|---|
| `Content-Type` | `application/json` |

O header `x-webhook-signature` será preenchido automaticamente pelo script do próximo passo.

Na aba **Body**:

1. Selecione **raw**.
2. Escolha o formato **JSON**.
3. Insira o exemplo abaixo:

```json
{
  "eventId": "eval-event-001",
  "saleId": "eval-sale-001",
  "status": "PENDING",
  "amount": 149.90,
  "currency": "BRL",
  "createdAt": "2026-10-27T12:00:00.000Z",
  "occurredAt": "2026-10-27T12:00:00.000Z"
}
```

#### Passo 3 — Configurar o script de assinatura

Na aba **Scripts → Pre-request**, adicione o código abaixo:

```javascript
const secret = pm.environment.get("webhook_secret");

if (!secret) {
  throw new Error(
    "Configure a variável de ambiente webhook_secret antes de enviar a requisição."
  );
}

const body = pm.request.body.raw;

if (typeof body !== "string") {
  throw new Error("O corpo da requisição deve estar no formato raw.");
}

const signature = CryptoJS.HmacSHA256(body, secret)
  .toString(CryptoJS.enc.Hex);

pm.request.headers.upsert({
  key: "x-webhook-signature",
  value: signature
});
```

O script utiliza o corpo bruto da requisição para gerar a assinatura HMAC-SHA256 em hexadecimal e preencher o header `x-webhook-signature` automaticamente.

**Alternativa:** para um teste rápido, o segredo pode ser colocado diretamente no script, substituindo:

```javascript
const secret = pm.environment.get("webhook_secret");
```

por:

```javascript
const secret = "SEGREDO_RECEBIDO_PRIVADAMENTE";
```

Nesse caso, não compartilhe nem publique o script com o segredo preenchido. A variável de ambiente continua sendo a opção recomendada.

#### Passo 4 — Enviar e conferir a resposta

Clique em **Send**.

As principais respostas esperadas são:

- `201 Created`: novo evento processado.
- `200 OK`: evento já recebido anteriormente.
- `400 Bad Request`: corpo inválido.
- `401 Unauthorized`: assinatura ausente ou inválida.

Para testar a idempotência, envie novamente o mesmo corpo sem alterar o `eventId`. A API deve reconhecer o evento duplicado sem processá-lo novamente.

Para testar uma atualização de status, mantenha o mesmo `saleId`, utilize um `eventId` novo e informe um `occurredAt` posterior.

Os endpoints de monitoramento são:

- `GET /health`: verifica se a aplicação está disponível.
- `GET /health/db`: verifica a conexão com o banco de dados.

## 2. Premissas e decisões

### Formato do evento

Foi adotado um formato de evento único, independente do provedor de checkout, com `eventId`, `saleId`, `status`, `amount`, `currency`, `createdAt` e `occurredAt`. Os status aceitos são `PENDING`, `APPROVED` e `CANCELLED`; as moedas aceitas são `BRL`, `USD` e `EUR`. O valor deve ser positivo e as datas devem estar em formato ISO 8601.

**Decisão:** manter um contrato pequeno e explícito facilita validar os dados e comparar eventos. Não foram implementados adaptadores para formatos específicos de diferentes plataformas de checkout; cada integração precisaria mapear seu payload para esse contrato.

### Autenticidade dos postbacks

O endpoint de entrada exige uma assinatura HMAC-SHA256 hexadecimal no header `x-webhook-signature`, calculada sobre o corpo bruto da requisição com um segredo compartilhado.

**Decisão:** validar a assinatura permite rejeitar requisições sem o segredo correto e evita enviar o segredo diretamente na requisição. O segredo é configuração de ambiente, não parte do código nem do payload. Os endpoints `GET` não exigem autenticação nesta versão, pois o escopo do desafio prioriza o recebimento e a consulta dos dados. Em um produto com dados sensíveis, seria necessário avaliar controles de acesso também para as consultas.

### Idempotência e histórico

Cada evento tem um `eventId` único. Se o mesmo evento for reenviado, ele não é processado novamente. Os eventos recebidos ficam registrados em `WebHookEvent`, separadamente dos dados consolidados de `Sale`.

**Decisão:** a separação evita criar vendas duplicadas durante retentativas do checkout e preserva o histórico das notificações, enquanto `Sale` representa o estado consolidado de cada venda.

### Ordenação e transições de status

O campo `occurredAt` é usado para determinar a ordem cronológica dos eventos. Eventos mais antigos são mantidos no histórico, mas não sobrescrevem o estado atual da venda. As transições de status previstas são `PENDING → APPROVED`, `PENDING → CANCELLED` e `APPROVED → CANCELLED`. Um evento que repete o status atual também é aceito.

**Decisão:** webhooks podem chegar atrasados ou fora de ordem; comparar as datas evita que um evento antigo reverta um estado mais recente. A política de transições impede, por exemplo, que uma venda cancelada volte a ser aprovada.

### Consistência em operações concorrentes

O processamento de eventos usa transações do Prisma com isolamento `Serializable` e tentativas adicionais para erros específicos de concorrência e unicidade.

**Decisão:** isso reduz o risco de inconsistências quando eventos chegam simultaneamente ou quando o mesmo evento é enviado em mais de uma requisição concorrente.

### Validação e relatórios

O payload é validado antes do processamento. A listagem de vendas usa paginação, com limite máximo de 100 registros por página. O resumo agrupa as vendas por status e soma apenas os valores aprovados, agrupados por moeda.

**Decisão:** validar na entrada reduz a chance de persistir dados inválidos; a paginação limita o tamanho das respostas; e separar os totais por moeda evita somar valores de moedas diferentes sem conversão cambial.

### O que ficou fora do escopo

Para manter o foco no receptor de postbacks e nos relatórios, esta versão não inclui:

- login, cadastro de usuários, papéis ou controle de acesso para usuários;
- painel administrativo ou interface web;
- conectores específicos para provedores de checkout.

Esses itens podem ser considerados em uma evolução do projeto, conforme os requisitos de negócio e de operação.

## 3. Funcionalidades

- Recebimento de postbacks por `POST /webhooks/sales`.
- Validação de assinatura HMAC-SHA256.
- Validação do payload.
- Persistência de vendas e histórico de eventos em PostgreSQL.
- Idempotência por `eventId`.
- Tratamento de eventos fora de ordem e controle de transições de status.
- Consulta de vendas com paginação em `GET /sales`.
- Relatório agregado em `GET /sales/summary`.
- Monitoramento em `GET /health` e `GET /health/db`.
- Testes automatizados.

## 4. Tecnologias

- Node.js e TypeScript
- Express 5
- PostgreSQL
- Prisma ORM
- Zod
- Vitest e Supertest
- Render para hospedagem da API
- Supabase para o banco de dados PostgreSQL

## 5. Arquitetura

A aplicação utiliza uma arquitetura em camadas para manter as responsabilidades separadas:

- **Routes:** definem os endpoints disponíveis.
- **Controllers:** coordenam as requisições e as respostas HTTP.
- **Services:** implementam o processamento dos eventos e as regras de negócio.
- **Schemas:** validam os dados recebidos.
- **Middlewares:** tratam autenticação dos webhooks e erros.
- **Prisma:** gerencia o acesso ao PostgreSQL.

O modelo `Sale` armazena o estado consolidado da venda. O modelo `WebHookEvent` armazena os eventos recebidos e seus dados, relacionados à venda correspondente.

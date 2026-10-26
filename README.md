# TWR Postback Receiver

API REST desenvolvida em Node.js e TypeScript para receber, validar e processar notificações de vendas via webhooks. 

## Funcionalidades

- Recebimento de notificações de vendas por meio de webhooks HTTP.
- Autenticação de webhooks utilizando HMAC SHA-256.
- Validação dos dados recebidos com Zod.
- Persistência de vendas e eventos em PostgreSQL.
- Prevenção do processamento duplicado de eventos.
- Tratamento de eventos recebidos fora de ordem cronológica.
- Controle das transições de status das vendas.
- Consulta de vendas com paginação.
- Relatório agregado de vendas por status e moeda.
- Testes automatizados com Vitest e Supertest.

## Tecnologias

- Node.js
- TypeScript
- Express 5
- PostgreSQL
- Prisma ORM
- Zod
- Vitest
- Supertest

## Arquitetura

A aplicação utiliza uma arquitetura em camadas para separar responsabilidades:

- **Routes:** definem os endpoints da API.
- **Controllers:** validam as requisições e coordenam as respostas HTTP.
- **Services:** implementam as regras de negócio.
- **Schemas:** definem os formatos e as validações dos dados.
- **Middlewares:** tratam autenticação e erros.
- **Prisma:** gerencia o acesso ao banco de dados.

## Endpoints

### Monitoramento

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/ping` | Verificação simples da API |
| GET | `/health` | Verifica se a aplicação está respondendo |
| GET | `/health/db` | Verifica a conexão com o banco de dados |

### Webhooks

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/webhooks/sales` | Recebe e processa eventos de vendas |

O endpoint exige uma assinatura HMAC SHA-256 hexadecimal no cabeçalho `x-webhook-signature`.

Exemplo de payload:

```json
{
  "eventId": "evt_001",
  "saleId": "sale_001",
  "status": "PENDING",
  "amount": 149.90,
  "currency": "BRL",
  "createdAt": "2026-10-26T10:00:00.000Z",
  "occurredAt": "2026-10-26T10:00:00.000Z"
}
```

Campos aceitos:

- `eventId`: identificador único do evento.
- `saleId`: identificador da venda.
- `status`: `PENDING`, `APPROVED` ou `CANCELLED`.
- `amount`: valor numérico positivo.
- `currency`: `BRL`, `USD` ou `EUR`.
- `createdAt`: data de criação da venda em formato ISO 8601.
- `occurredAt`: data em que o evento ocorreu, em formato ISO 8601.

Respostas principais:

- `201 Created`: evento processado.
- `200 OK`: evento já processado anteriormente.
- `400 Bad Request`: payload inválido.
- `401 Unauthorized`: assinatura ausente ou inválida.
- `500 Internal Server Error`: segredo de autenticação não configurado.

### Consulta de vendas

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/sales` | Lista vendas com paginação |
| GET | `/sales/summary` | Retorna um resumo agregado das vendas |

A listagem aceita os parâmetros `page` e `limit`.

Exemplo:

```http
GET /sales?page=1&limit=10
```

Os parâmetros são opcionais. Os valores padrão são `page=1` e `limit=10`, e o limite máximo de resultados por página é 100.

O endpoint `/sales/summary` retorna:

- Total de vendas.
- Quantidade de vendas por status.
- Soma dos valores das vendas aprovadas, agrupada por moeda.

## Regras de negócio

### Idempotência

Cada evento possui um identificador único (`eventId`). Se o mesmo evento for recebido novamente, ele não será registrado ou processado novamente.

### Eventos fora de ordem

A aplicação utiliza o campo `occurredAt` para determinar a ordem cronológica dos eventos.

Eventos mais antigos são registrados no histórico, mas não alteram o estado atual da venda.

### Transições de status

As transições permitidas são:

- `PENDING` → `APPROVED`
- `PENDING` → `CANCELLED`
- `APPROVED` → `CANCELLED`

Um evento que repete o status atual também é aceito. A mudança de estado só acontece quando o evento é mais recente que o último evento considerado para a venda.

### Histórico de eventos

Os eventos recebidos são armazenados separadamente das vendas, permitindo manter o histórico de notificações processadas.

### Concorrência

O processamento utiliza transações do Prisma com isolamento `Serializable` e tentativas adicionais para determinados erros de concorrência e violações de unicidade.

## Modelo de dados

A aplicação utiliza dois modelos principais:

**Sale**

Armazena os dados consolidados da venda, incluindo identificador, status, valor, moeda e datas.

**WebHookEvent**

Armazena o histórico de eventos recebidos, incluindo identificador único, venda associada, status, data de ocorrência, data de recebimento e payload original.

A relação entre os modelos permite consultar os eventos associados a cada venda.

## Pré-requisitos

- Node.js
- npm
- PostgreSQL
- Git

## Configuração local

### 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd twr-postback-receiver
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3001
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco?schema=public"
WEBHOOK_SECRET="substitua-por-um-segredo-forte"
```

Configure a URL de conexão de acordo com seu banco PostgreSQL.

O `WEBHOOK_SECRET` deve ser o mesmo segredo compartilhado com o sistema responsável por enviar os webhooks.

**Não compartilhe nem envie arquivos `.env` para o repositório.**

### 4. Gerar o cliente Prisma

```bash
npx prisma generate
```

### 5. Aplicar as migrações

Para um ambiente de desenvolvimento:

```bash
npx prisma migrate dev
```

Para aplicar migrações existentes em um ambiente de produção:

```bash
npx prisma migrate deploy
```

Utilize a URL do banco de dados correspondente ao ambiente desejado.

### 6. Iniciar a aplicação

Em desenvolvimento:

```bash
npm run dev
```

Para compilar e iniciar a aplicação:

```bash
npm run build
npm start
```

Por padrão, a aplicação utiliza a porta `3001`.

## Testes automatizados

Os testes utilizam Vitest e Supertest.

Para executá-los:

```bash
npm test
```

É necessário configurar previamente o arquivo `.env.test` e criar o banco de dados de testes `twr-postback-receiver-test`, aplicando suas migrações.

**Atenção:** os testes apagam os registros das tabelas de vendas e eventos antes de cada caso. A suíte contém uma verificação para impedir essa limpeza caso a URL não aponte para o banco de testes esperado.

Nunca configure os testes para utilizar um banco com dados importantes.



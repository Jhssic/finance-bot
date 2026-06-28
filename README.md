# Finance Bot

Bot financeiro para WhatsApp usando Node.js, Gemini e Notion.

## Como usar

1. Preencha o arquivo `.env`:
   - `GEMINI_API_KEY`
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`
   - `WHATSAPP_GROUP_NAME`

2. Instale dependências:
   ```bash
   npm install
   ```

3. Inicie o bot:
   ```bash
   npm start
   ```

4. Escaneie o QR code que aparecerá no terminal.

## Estrutura do projeto

```
finance-bot/
├── src/
│   ├── index.js
│   ├── gemini.js
│   ├── notion.js
│   └── handlers/
│       ├── transaction.js
│       ├── report.js
│       └── edit.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Criação da database no Notion

Crie uma database com as seguintes propriedades:

- `Nome` (Title)
- `Valor` (Number)
- `Tipo` (Select) com opções: `gasto`, `entrada`
- `Categoria` (Select) com opções:
  - `alimentação`
  - `transporte`
  - `moradia`
  - `saúde`
  - `lazer`
  - `outros`
  - `salário`
  - `freela`
  - `outros-entrada`
- `Data` (Date)
- `Quem` (Select) com opções: `Jhess`, `Regi`
- `ID curto` (Rich Text)

Depois de criar, copie o ID do banco de dados para `NOTION_DATABASE_ID`.

## Funcionalidades

- Escuta mensagens do grupo do WhatsApp definido em `WHATSAPP_GROUP_NAME`
- Ignora mensagens do próprio bot
- Interpreta gastos, entradas, consultas, edições e exclusões
- Salva e atualiza dados no Notion
- Gera relatórios de resumo com Gemini

## Deploy no Railway

1. Crie um novo projeto no Railway e conecte ao repositório do bot.
2. Configure o comando de start:
   ```bash
   npm start
   ```
3. Adicione as variáveis de ambiente no Railway:
   - `GEMINI_API_KEY`
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`
   - `WHATSAPP_GROUP_NAME`
4. O bot usa sessão local do WhatsApp em `.wwebjs_auth`. No Railway, o ideal é usar um volume persistente ou um storage externo para manter a sessão entre deploys.

### Notas importantes para Railway

- A primeira vez, é melhor rodar localmente para escanear o QR code e gerar a sessão em `.wwebjs_auth`.
- Se o Railway não suportar persistência de arquivos no serviço gratuito, será necessário rever o armazenamento da sessão ou manter o bot em um servidor com disco persistente.
- Em caso de falha de sessão, apague a pasta `.wwebjs_auth` localmente e faça novo login.

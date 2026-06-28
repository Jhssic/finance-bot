# 💸 Finance Bot

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3-F55036?style=for-the-badge&logo=meta&logoColor=white)
![Notion](https://img.shields.io/badge/Notion-000000?style=for-the-badge&logo=notion&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/Licença-MIT-blue?style=for-the-badge)

**Bot financeiro para WhatsApp com IA — registre gastos em linguagem natural, visualize gráficos e acompanhe seu saldo direto no grupo.**

</div>

---

## ✨ Funcionalidades

| Comando | O que faz |
|---|---|
| `mercado 85,90` | Registra um gasto |
| `gastei 50 no uber` | Gasto com descrição livre |
| `recebi salario 3200` | Registra uma entrada |
| `entrou 500 do freela` | Entrada com descrição livre |
| `!resumo` | Relatório completo do mês |
| `!saldo` | Saldo atual |
| `!grafico` | Gráfico de pizza por categoria |
| `!grafico barras` | Entradas vs gastos dos últimos 6 meses |
| `!grafico jhess` | Gastos da Jhess no mês |
| `!grafico regi` | Gastos do Regi no mês |
| `!grafico linha` | Evolução do saldo ao longo do mês |
| `!editar ID valor 90` | Edita o valor de um registro |
| `!deletar ID` | Remove um registro |
| `menu` ou `!menu` | Lista todos os comandos |

---

## 🏗️ Como funciona

```
WhatsApp (mensagem de texto)
         ↓
whatsapp-web.js — escuta o grupo
         ↓
Groq API (Llama 3.3 70B) — interpreta linguagem natural
         ↓
Notion API — armazena a transação
         ↓
WhatsApp — confirmação, relatório ou gráfico
```

---

## 🗂️ Estrutura do projeto

```
finance-bot/
├── src/
│   ├── index.js              # Inicialização, WhatsApp client e roteamento
│   ├── gemini.js             # Integração com Groq (interpretação + relatórios)
│   ├── notion.js             # CRUD e queries no banco Notion
│   └── handlers/
│       ├── transaction.js    # Salva transações
│       ├── report.js         # Gera relatório em texto
│       ├── edit.js           # Edição e exclusão de registros
│       └── chart.js          # Geração de gráficos com Chart.js
├── .env                      # Variáveis de ambiente (não versionar)
├── .gitignore
├── package.json
└── README.md
```

---

## 🗃️ Estrutura do banco Notion

| Campo | Tipo | Valores |
|---|---|---|
| Name | title | Descrição da transação |
| Valor | number | Valor em reais |
| Tipo | select | `gasto` · `entrada` |
| Categoria | select | alimentação · transporte · moradia · saúde · lazer · outros · salário · freela · outros-entrada |
| Data | date | Data da transação |
| Quem | select | `Jhess` · `Regi` |
| ID curto | rich_text | Identificador para edição/exclusão |

---

## 🚀 Como rodar

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/finance-bot.git
cd finance-bot
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o `.env`

```env
# Groq — https://console.groq.com
GROQ_API_KEY=gsk_...

# Notion — https://www.notion.so/my-integrations
NOTION_TOKEN=secret_...
NOTION_DATABASE_ID=...

# Nome exato do grupo no WhatsApp
WHATSAPP_GROUP_NAME=Nome do Grupo

# Número do Regi para identificação (opcional, sem + ou espaços)
WHATSAPP_NUMBER_REGI=5511999999999

# MongoDB para persistência da sessão WhatsApp
MONGODB_URI=mongodb+srv://...
```

### 4. Inicie o bot

```bash
npm start
```

Escaneie o QR code que aparecer no terminal. A sessão fica salva no MongoDB — nas próximas inicializações não precisa escanear novamente.

### 5. Manter rodando com PM2

```bash
npm install -g pm2
pm2 start src/index.js --name finance-bot
pm2 save
pm2 startup   # faz o processo iniciar automaticamente com o sistema
```

---

## 📸 Exemplos de uso

> *(adicione prints do bot em ação aqui)*

<!-- SCREENSHOT_REGISTRO -->
<!-- SCREENSHOT_GRAFICO_PIZZA -->
<!-- SCREENSHOT_RELATORIO -->

---

## 🔧 Stack

| Tecnologia | Uso |
|---|---|
| [Node.js](https://nodejs.org) | Runtime |
| [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) | Integração com WhatsApp Web |
| [Groq API](https://groq.com) — Llama 3.3 70B | Interpretação de linguagem natural e relatórios |
| [Notion API](https://developers.notion.com) | Banco de dados das transações |
| [chartjs-node-canvas](https://github.com/SeanSobey/ChartjsNodeCanvas) | Geração de gráficos como imagem |
| [wwebjs-mongo](https://github.com/jtouris/wwebjs-mongo) + MongoDB | Persistência da sessão WhatsApp |
| [PM2](https://pm2.keymetrics.io) | Gerenciamento de processo em produção |

---

## 🤝 Como contribuir

1. Faça um fork do projeto
2. Crie uma branch: `git checkout -b minha-feature`
3. Commit suas alterações: `git commit -m 'feat: minha feature'`
4. Push para o fork: `git push origin minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
Feito com 💜 para organizar as finanças sem sair do WhatsApp
</div>

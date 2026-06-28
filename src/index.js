require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { interpretMessage } = require('./gemini');
const { handleReport } = require('./handlers/report');
const { handleTransaction } = require('./handlers/transaction');
const { handleEdit } = require('./handlers/edit');
const { handleChart } = require('./handlers/chart');

const groupName = process.env.WHATSAPP_GROUP_NAME;
if (!groupName) {
  console.error('⚠️  Defina WHATSAPP_GROUP_NAME no .env');
  process.exit(1);
}

function getPersonName(message) {
  const number = message.author || message.from;
  if (message.fromMe) return 'Jhess';
  const regiNumber = process.env.WHATSAPP_NUMBER_REGI;
  if (regiNumber && number.includes(regiNumber)) return 'Regi';
  return 'Regi';
}

async function main() {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'finance-bot',
      dataPath: './.wwebjs_auth'
    }),
   puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
  });

  client.on('qr', qr => {
    console.log('📱 Escaneie o QR code do WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp pronto. Aguardando mensagens no grupo:', groupName);
  });

  client.on('message_create', async message => {
      console.log('📨 Qualquer mensagem:', message.body);
    try {
      if (message.body.startsWith('✅') || message.body.startsWith('❌')) return;

      const chat = await message.getChat();
      if (!chat.isGroup) return;
      if (chat.name !== groupName) return;

      console.log('📩 Mensagem recebida:', message.body, '| fromMe:', message.fromMe);

      const text = message.body.trim();
      const author = getPersonName(message);
      const normalized = text.toLowerCase();

      if (normalized.startsWith('!grafico')) {
        const type = normalized.replace('!grafico', '').trim() || 'pizza';
        await handleChart(message, type);
        return;
      }

      const handled = await handleEdit(message, text);
      if (handled) return;

      if (normalized === 'menu' || normalized === '!menu' || normalized === 'ajuda' || normalized === '!ajuda') {
        await message.reply(`🤖 *Comandos disponíveis:*

        💰 *Registrar gasto:*
        mercado 85,90
        gastei 50 no uber
        almoço 32,00

        💵 *Registrar entrada:*
        recebi salario 3200
        entrou 500 do freela

        📊 *Relatórios:*
        !resumo — resumo do mês
        !saldo — saldo atual

        📈 *Gráficos:*
        !grafico — pizza por categoria
        !grafico barras — entradas vs gastos
        !grafico jhess — gastos da Jhess
        !grafico regi — gastos do Regi
        !grafico linha — evolução do saldo

        ✏️ *Editar e deletar:*
        !editar ID valor 90
        !deletar ID`);
        return;
      }

      const isReportCommand = normalized.startsWith('!resumo') || normalized.startsWith('!saldo');
      if (isReportCommand) {
        await handleReport(message, normalized.startsWith('!saldo') ? 'saldo' : 'resumo');
        return;
      }

      const parsed = await interpretMessage(text, author);
      if (!parsed) return;

      if (parsed.action === 'query') {
        await handleReport(message, parsed.queryType || 'resumo');
        return;
      }

      if (parsed.action === 'transaction') {
        await handleTransaction(message, parsed);
        return;
      }

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  client.initialize();
}

main();
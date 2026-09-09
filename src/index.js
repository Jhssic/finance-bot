require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
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

// Cache de nomes de grupos para evitar chamadas repetidas
const groupCache = {};

async function getGroupName(sock, jid) {
  if (!groupCache[jid]) {
    try {
      const meta = await sock.groupMetadata(jid);
      groupCache[jid] = meta.subject;
    } catch {
      groupCache[jid] = null;
    }
  }
  return groupCache[jid];
}

function getTextFromMessage(msg) {
  const m = msg.message;
  if (!m) return '';
  return m.conversation ||
         m.extendedTextMessage?.text ||
         m.listResponseMessage?.singleSelectReply?.selectedRowId ||
         m.imageMessage?.caption ||
         m.videoMessage?.caption || '';
}

// Monta o menu interativo (botão "Ver opções" com lista clicável)
function buildMenuList() {
  return {
    text: '👋 Escolha uma opção abaixo ou digite um comando diretamente.',
    footer: 'Finance Bot 💸',
    title: '🤖 Menu Principal',
    buttonText: 'Ver opções',
    sections: [
      {
        title: '📊 Relatórios',
        rows: [
          { title: 'Resumo do mês', rowId: '!resumo', description: 'Entradas, gastos e saldo' },
          { title: 'Saldo atual', rowId: '!saldo', description: 'Saldo do mês' }
        ]
      },
      {
        title: '📈 Gráficos',
        rows: [
          { title: 'Pizza por categoria', rowId: '!grafico', description: 'Gastos do mês por categoria' },
          { title: 'Barras — Entradas vs Gastos', rowId: '!grafico barras', description: 'Últimos 6 meses' },
          { title: 'Gastos da Jhess', rowId: '!grafico jhess', description: 'Categorias da Jhess no mês' },
          { title: 'Gastos do Regi', rowId: '!grafico regi', description: 'Categorias do Regi no mês' },
          { title: 'Evolução do saldo', rowId: '!grafico linha', description: 'Saldo dia a dia no mês' }
        ]
      },
      {
        title: '✏️ Como usar',
        rows: [
          { title: 'Como registrar um gasto', rowId: '!ajuda-gasto', description: 'Ex: mercado 85,90' },
          { title: 'Como registrar uma entrada', rowId: '!ajuda-entrada', description: 'Ex: recebi salario 3200' },
          { title: 'Como editar ou deletar', rowId: '!ajuda-editar', description: 'Ex: !editar ID valor 90' }
        ]
      }
    ]
  };
}

const HELP_TEXTS = {
  '!ajuda-gasto': '💰 *Para registrar um gasto, envie algo como:*\n\nmercado 85,90\ngastei 50 no uber\nalmoço 32,00',
  '!ajuda-entrada': '💵 *Para registrar uma entrada, envie algo como:*\n\nrecebi salario 3200\nentrou 500 do freela',
  '!ajuda-editar': '✏️ *Para editar ou deletar:*\n\n!editar ID valor 90\n!deletar ID'
};

function getPersonName(msg) {
  if (msg.key.fromMe) return 'Jhess';
  const participant = msg.key.participant || msg.key.remoteJid;
  const regiNumber = process.env.WHATSAPP_NUMBER_REGI;
  if (regiNumber && participant.includes(regiNumber)) return 'Regi';
  return 'Regi'; // padrão para outros números
}

// Wrapper de compatibilidade: adiciona .reply() ao objeto de mensagem
function buildMessage(sock, msg, remoteJid) {
  return {
    body: getTextFromMessage(msg),
    fromMe: msg.key.fromMe,
    author: msg.key.participant || msg.key.remoteJid,
    from: remoteJid,
    reply: async (content, _, options) => {
      if (typeof content === 'string') {
        await sock.sendMessage(remoteJid, { text: content }, { quoted: msg });
      } else if (content && content.data) {
        // objeto media vindo do chart.js
        const buffer = Buffer.from(content.data, 'base64');
        await sock.sendMessage(remoteJid, {
          image: buffer,
          caption: options?.caption || ''
        }, { quoted: msg });
      }
    }
  };
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('.baileys_auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('📱 Escaneie o QR code do WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexão encerrada. Reconectando:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000);
      }
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp pronto. Aguardando mensagens no grupo:', groupName);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type: upsertType }) => {
    if (upsertType !== 'notify') return;

    for (const msg of messages) {
      try {
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid.endsWith('@g.us')) continue;

        const text = getTextFromMessage(msg);
        if (!text) continue;
        if (text.startsWith('✅') || text.startsWith('❌')) continue;

        const name = await getGroupName(sock, remoteJid);
        if (name !== groupName) continue;

        console.log('📩 Mensagem recebida:', text, '| fromMe:', msg.key.fromMe);

        const message = buildMessage(sock, msg, remoteJid);
        const author = getPersonName(msg);
        const normalized = text.toLowerCase().trim();

        if (normalized === 'menu' || normalized === '!menu' || normalized === 'ajuda' || normalized === '!ajuda') {
          await sock.sendMessage(remoteJid, buildMenuList(), { quoted: msg });
          continue;
        }

        if (HELP_TEXTS[normalized]) {
          await message.reply(HELP_TEXTS[normalized]);
          continue;
        }

        if (normalized.startsWith('!grafico')) {
          const chartType = normalized.replace('!grafico', '').trim() || 'pizza';
          await handleChart(message, chartType);
          continue;
        }

        const handled = await handleEdit(message, text);
        if (handled) continue;

        const isReportCommand = normalized.startsWith('!resumo') || normalized.startsWith('!saldo');
        if (isReportCommand) {
          await handleReport(message, normalized.startsWith('!saldo') ? 'saldo' : 'resumo');
          continue;
        }

        const parsed = await interpretMessage(text, author);
        if (!parsed) continue;

        if (parsed.action === 'query') {
          await handleReport(message, parsed.queryType || 'resumo');
          continue;
        }

        if (parsed.action === 'transaction') {
          await handleTransaction(message, parsed);
          continue;
        }

      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    }
  });
}

connectToWhatsApp();

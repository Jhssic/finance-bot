require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function callGroq(prompt, jsonMode = false) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: prompt }],
      ...(jsonMode && { response_format: { type: 'json_object' } })
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Erro Groq:', error.message || error);
    return null;
  }
}

function normalizeNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return null;
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const number = parseFloat(cleaned);
  return Number.isFinite(number) ? number : null;
}

function formatValue(value) {
  return Number(value).toFixed(2).replace('.', ',');
}

async function interpretMessage(text, author) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Você é um assistente financeiro que interpreta mensagens em português de um grupo de WhatsApp.

Responda SOMENTE com JSON válido, sem texto extra, sem markdown.

Campos obrigatórios:
- action: "transaction", "query" ou "ignore"
- transactionType: "gasto", "entrada" ou null
- value: número decimal (ex: 67, 150.50) — NUNCA string, NUNCA null se houver número na mensagem
- description: texto descritivo ou null
- category: "alimentação", "transporte", "moradia", "saúde", "lazer", "outros", "salário", "freela" ou "outros-entrada"
- date: data no formato YYYY-MM-DD (hoje é ${today}) ou null
- queryType: "resumo", "saldo" ou null

Regras:
- Qualquer gasto/compra/despesa → action "transaction", transactionType "gasto"
- Qualquer recebimento/entrada/salário → action "transaction", transactionType "entrada"
- Consultas (!resumo, !saldo, quanto gastei) → action "query"
- Qualquer outra coisa → action "ignore"
- Se não tiver categoria clara: "outros" para gasto, "outros-entrada" para entrada

Exemplos:
"mercado 67" → {"action":"transaction","transactionType":"gasto","value":67,"description":"mercado","category":"alimentação","date":"${today}","queryType":null}
"recebi 3200 salario" → {"action":"transaction","transactionType":"entrada","value":3200,"description":"salário","category":"salário","date":"${today}","queryType":null}
"!resumo" → {"action":"query","transactionType":null,"value":null,"description":null,"category":null,"date":null,"queryType":"resumo"}

Mensagem: "${text}"`;

  const responseText = await callGroq(prompt, true);
  if (!responseText) return null;

  console.log('🤖 Groq respondeu:', responseText);
  
  let parsed;
  try {
    const clean = responseText.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch (error) {
    return null;
  }

  if (!parsed || !parsed.action || parsed.action === 'ignore') return null;

  if (parsed.action === 'query') {
    return {
      action: 'query',
      queryType: parsed.queryType === 'saldo' ? 'saldo' : 'resumo'
    };
  }

  if (parsed.action === 'transaction') {
    const value = normalizeNumber(parsed.value);
    if (!value || !parsed.transactionType) return null;

    return {
      action: 'transaction',
      transactionType: parsed.transactionType,
      value,
      description: parsed.description || text,
      category: parsed.category || (parsed.transactionType === 'entrada' ? 'outros-entrada' : 'outros'),
      date: parsed.date || new Date().toISOString().slice(0, 10),
      person: author || 'Desconhecido'
    };
  }

  return null;
}

async function generateReport(summary, queryType = 'resumo') {
  if (!summary) return 'Não consegui gerar o relatório, tente novamente mais tarde.';

  const prompt = `Você é um assistente financeiro. Gere um relatório curto e direto para WhatsApp em português.

Dados do mês:
- Entradas: R$ ${summary.totalEntradas.toFixed(2)}
- Gastos: R$ ${summary.totalGastos.toFixed(2)}
- Saldo: R$ ${summary.saldo.toFixed(2)}
- Top categorias: ${summary.topCategories.map(i => `${i.category}: R$ ${i.total.toFixed(2)}`).join(', ')}
- Total de registros: ${summary.totalRecords}

Use emojis, seja leve e direto. Máximo 10 linhas.`;

  const responseText = await callGroq(prompt);
  return responseText ? responseText.trim() : 'Não consegui gerar o relatório no momento.';
}

module.exports = { interpretMessage, generateReport, formatValue };
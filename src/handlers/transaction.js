const { createTransaction } = require('../notion');

function generateShortId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function formatCurrency(value) {
  const formatted = Number(value).toFixed(2).replace('.', ',');
  return `R$ ${formatted}`;
}

async function handleTransaction(message, parsed) {
  try {
    const shortId = generateShortId();
    await createTransaction({
      description: parsed.description,
      value: parsed.value,
      type: parsed.transactionType,
      category: parsed.category,
      date: parsed.date,
      person: parsed.person,
      shortId
    });

    const response = `✅ Anotado! ${parsed.description} - ${formatCurrency(parsed.value)} (${parsed.category})\nID: ${shortId}`;
    await message.reply(response);
    return true;
  } catch (error) {
    console.error('Erro handleTransaction:', error.message || error);
    await message.reply('❌ Não foi possível salvar a transação agora. Tente novamente mais tarde.');
    return false;
  }
}

module.exports = { handleTransaction };

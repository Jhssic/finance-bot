const { findTransactionByShortId, updateTransaction, deleteTransaction } = require('../notion');

const editRegex = /^!editar\s+([A-Za-z0-9]+)\s+valor\s+([0-9]+(?:[.,][0-9]+)?)/i;
const deleteRegex = /^!deletar\s+([A-Za-z0-9]+)/i;

async function handleEdit(message, text) {
  try {
    const normalized = text.trim();

    const deleteMatch = deleteRegex.exec(normalized);
    if (deleteMatch) {
      const shortId = deleteMatch[1];
      const page = await findTransactionByShortId(shortId);
      if (!page) {
        await message.reply(`❌ Não encontrei transação com ID ${shortId}.`);
        return true;
      }
      await deleteTransaction(page.id);
      await message.reply(`✅ Entrada removida: ID ${shortId}.`);
      return true;
    }

    const editMatch = editRegex.exec(normalized);
    if (editMatch) {
      const shortId = editMatch[1];
      const valueText = editMatch[2];
      const value = parseFloat(valueText.replace(',', '.'));
      if (!Number.isFinite(value)) {
        await message.reply('❌ Valor inválido. Use algo como: !editar ID valor 90');
        return true;
      }

      const page = await findTransactionByShortId(shortId);
      if (!page) {
        await message.reply(`❌ Não encontrei transação com ID ${shortId}.`);
        return true;
      }

      await updateTransaction(page.id, { value });
      await message.reply(`✅ Atualizado! ID ${shortId} agora tem valor R$ ${value.toFixed(2).replace('.', ',')}.`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro handleEdit:', error.message || error);
    await message.reply('❌ Não foi possível processar o comando de edição agora.');
    return true;
  }
}

module.exports = { handleEdit };

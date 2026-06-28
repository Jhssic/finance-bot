const { getMonthlySummary } = require('../notion');
const { generateReport } = require('../gemini');

async function handleReport(message, reportType = 'resumo') {
  try {
    const summary = await getMonthlySummary();
    if (!summary || summary.totalRecords === 0) {
      await message.reply('Ainda não há registros para este mês. Use mensagens de gasto ou entrada para começar a anotar.');
      return true;
    }

    const reportText = await generateReport(summary, reportType);
    await message.reply(reportText);
    return true;
  } catch (error) {
    console.error('Erro handleReport:', error.message || error);
    await message.reply('❌ Não foi possível gerar o relatório agora. Tente novamente mais tarde.');
    return false;
  }
}

module.exports = { handleReport };

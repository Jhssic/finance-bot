const { MessageMedia } = require('whatsapp-web.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { getMonthlySummary, getMonthlyHistory, getPersonSummary, getDailySaldo } = require('../notion');

const canvas = new ChartJSNodeCanvas({ width: 800, height: 500, backgroundColour: 'white' });

const CORES = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#C9CBCF', '#71B37C'
];

async function gerarGraficoPizza(summary) {
  const labels = summary.topCategories.map(c => c.category);
  const data = summary.topCategories.map(c => c.total);

  return canvas.renderToBuffer({
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: CORES.slice(0, labels.length) }]
    },
    options: {
      plugins: {
        title: { display: true, text: 'Gastos por Categoria', font: { size: 18 } },
        legend: { position: 'bottom' }
      }
    }
  });
}

async function gerarGraficoBarras(history) {
  return canvas.renderToBuffer({
    type: 'bar',
    data: {
      labels: history.map(h => h.month),
      datasets: [
        { label: 'Entradas', data: history.map(h => h.entradas), backgroundColor: '#36A2EB' },
        { label: 'Gastos', data: history.map(h => h.gastos), backgroundColor: '#FF6384' }
      ]
    },
    options: {
      plugins: {
        title: { display: true, text: 'Entradas vs Gastos — últimos 6 meses', font: { size: 18 } }
      },
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function gerarGraficoPessoa(categories, person) {
  const labels = categories.map(c => c.category);
  const data = categories.map(c => c.total);

  return canvas.renderToBuffer({
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: CORES.slice(0, labels.length) }]
    },
    options: {
      plugins: {
        title: { display: true, text: `Gastos de ${person} no mês`, font: { size: 18 } },
        legend: { position: 'bottom' }
      }
    }
  });
}

async function gerarGraficoLinha(dailySaldo) {
  return canvas.renderToBuffer({
    type: 'line',
    data: {
      labels: dailySaldo.map(d => d.day),
      datasets: [{
        label: 'Saldo acumulado',
        data: dailySaldo.map(d => d.saldo),
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: 'Evolução do Saldo no Mês', font: { size: 18 } }
      },
      scales: { y: { beginAtZero: false } }
    }
  });
}

async function handleChart(message, type) {
  try {
    let imageBuffer;
    let caption;

    if (type === 'barras') {
      const history = await getMonthlyHistory();
      imageBuffer = await gerarGraficoBarras(history);
      caption = '📊 Entradas vs Gastos — últimos 6 meses';
    } else if (type === 'jhess') {
      const categories = await getPersonSummary('Jhess');
      if (!categories.length) {
        await message.reply('Nenhum gasto da Jhess registrado este mês.');
        return;
      }
      imageBuffer = await gerarGraficoPessoa(categories, 'Jhess');
      caption = '📊 Gastos da Jhess este mês';
    } else if (type === 'regi') {
      const categories = await getPersonSummary('Regi');
      if (!categories.length) {
        await message.reply('Nenhum gasto do Regi registrado este mês.');
        return;
      }
      imageBuffer = await gerarGraficoPessoa(categories, 'Regi');
      caption = '📊 Gastos do Regi este mês';
    } else if (type === 'linha') {
      const dailySaldo = await getDailySaldo();
      if (!dailySaldo.length) {
        await message.reply('Nenhum dado encontrado para este mês.');
        return;
      }
      imageBuffer = await gerarGraficoLinha(dailySaldo);
      caption = '📈 Evolução do saldo no mês';
    } else {
      // padrão: pizza por categoria
      const summary = await getMonthlySummary();
      if (!summary.topCategories.length) {
        await message.reply('Nenhum dado encontrado para este mês.');
        return;
      }
      imageBuffer = await gerarGraficoPizza(summary);
      caption = '🥧 Gastos por categoria este mês';
    }

    const media = new MessageMedia('image/png', imageBuffer.toString('base64'), 'grafico.png');
    await message.reply(media, null, { caption });
  } catch (error) {
    console.error('Erro handleChart:', error.message || error);
    await message.reply('Não consegui gerar o gráfico, tente novamente.');
  }
}

module.exports = { handleChart };

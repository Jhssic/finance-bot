require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

if (!databaseId) {
  console.error('⚠️  Defina NOTION_DATABASE_ID no .env');
}

function buildProperties(data) {
  const properties = {};
  if (data.description !== undefined) {
    properties.Name = { title: [{ text: { content: data.description } }] };
  }
  if (data.value !== undefined) {
    properties.Valor = { number: data.value };
  }
  if (data.type) {
    properties.Tipo = { select: { name: data.type } };
  }
  if (data.category) {
    properties.Categoria = { select: { name: data.category } };
  }
  if (data.date) {
    properties.Data = { date: { start: data.date } };
  }
  if (data.person) {
    properties.Quem = { select: { name: data.person } };
  }
  if (data.shortId) {
    properties['ID curto'] = { rich_text: [{ text: { content: data.shortId } }] };
  }
  return properties;
}

async function createTransaction({ description, value, type, category, date, person, shortId }) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: buildProperties({ description, value, type, category, date, person, shortId })
    });
    return response;
  } catch (error) {
    console.error('Erro Notion createTransaction:', error.message || error);
    throw error;
  }
}

async function findTransactionByShortId(shortId) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'ID curto',
        rich_text: {
          equals: shortId
        }
      }
    });
    return response.results[0] || null;
  } catch (error) {
    console.error('Erro Notion findTransactionByShortId:', error.message || error);
    throw error;
  }
}

async function updateTransaction(pageId, updates) {
  try {
    const response = await notion.pages.update({
      page_id: pageId,
      properties: buildProperties(updates)
    });
    return response;
  } catch (error) {
    console.error('Erro Notion updateTransaction:', error.message || error);
    throw error;
  }
}

async function deleteTransaction(pageId) {
  try {
    const response = await notion.pages.update({
      page_id: pageId,
      archived: true
    });
    return response;
  } catch (error) {
    console.error('Erro Notion deleteTransaction:', error.message || error);
    throw error;
  }
}

async function queryAllPages(filter) {
  try {
    const results = [];
    let cursor = undefined;

    while (true) {
      const response = await notion.databases.query({
        database_id: databaseId,
        filter,
        start_cursor: cursor,
        page_size: 100,
        sorts: [{ property: 'Data', direction: 'descending' }]
      });
      results.push(...response.results);
      if (!response.has_more) {
        break;
      }
      cursor = response.next_cursor;
    }

    return results;
  } catch (error) {
    console.error('Erro Notion queryAllPages:', error.message || error);
    throw error;
  }
}

function extractNumericProperty(page, propertyName) {
  const prop = page.properties[propertyName];
  return prop && typeof prop.number === 'number' ? prop.number : 0;
}

function extractSelectName(page, propertyName) {
  const prop = page.properties[propertyName];
  return prop && prop.select ? prop.select.name : null;
}

function extractRichText(page, propertyName) {
  const prop = page.properties[propertyName];
  if (!prop || !Array.isArray(prop.rich_text)) {
    return null;
  }
  return prop.rich_text.map(item => item.text?.content || '').join('').trim() || null;
}

function extractDate(page, propertyName) {
  const prop = page.properties[propertyName];
  return prop && prop.date ? prop.date.start : null;
}

function convertTransaction(page) {
  return {
    id: page.id,
    description: page.properties.Name?.title?.[0]?.plain_text || '',
    value: extractNumericProperty(page, 'Valor'),
    type: extractSelectName(page, 'Tipo'),
    category: extractSelectName(page, 'Categoria'),
    date: extractDate(page, 'Data'),
    person: extractSelectName(page, 'Quem'),
    shortId: extractRichText(page, 'ID curto')
  };
}

async function getMonthlySummary() {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const filter = {
      and: [
        {
          property: 'Data',
          date: {
            on_or_after: firstDay
          }
        },
        {
          property: 'Data',
          date: {
            on_or_before: lastDay
          }
        }
      ]
    };

    const pages = await queryAllPages(filter);
    const summary = {
      totalEntradas: 0,
      totalGastos: 0,
      saldo: 0,
      totalRecords: pages.length,
      topCategories: []
    };

    const categoryMap = {};

    for (const page of pages) {
      const item = convertTransaction(page);
      if (item.type === 'entrada') {
        summary.totalEntradas += item.value;
      } else {
        summary.totalGastos += item.value;
      }
      const category = item.category || (item.type === 'entrada' ? 'outros-entrada' : 'outros');
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += item.value;
    }

    summary.saldo = summary.totalEntradas - summary.totalGastos;
    summary.topCategories = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return summary;
  } catch (error) {
    console.error('Erro Notion getMonthlySummary:', error.message || error);
    throw error;
  }
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

async function getMonthlyHistory() {
  try {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
      const monthLabel = `${MESES[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`;

      const filter = {
        and: [
          { property: 'Data', date: { on_or_after: firstDay } },
          { property: 'Data', date: { on_or_before: lastDay } }
        ]
      };

      const pages = await queryAllPages(filter);
      let entradas = 0;
      let gastos = 0;

      for (const page of pages) {
        const item = convertTransaction(page);
        if (item.type === 'entrada') {
          entradas += item.value;
        } else {
          gastos += item.value;
        }
      }

      months.push({ month: monthLabel, entradas, gastos });
    }

    return months;
  } catch (error) {
    console.error('Erro Notion getMonthlyHistory:', error.message || error);
    throw error;
  }
}

async function getPersonSummary(person) {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const filter = {
      and: [
        { property: 'Data', date: { on_or_after: firstDay } },
        { property: 'Data', date: { on_or_before: lastDay } },
        { property: 'Quem', select: { equals: person } },
        { property: 'Tipo', select: { equals: 'gasto' } }
      ]
    };

    const pages = await queryAllPages(filter);
    const categoryMap = {};

    for (const page of pages) {
      const item = convertTransaction(page);
      const category = item.category || 'outros';
      if (!categoryMap[category]) categoryMap[category] = 0;
      categoryMap[category] += item.value;
    }

    return Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  } catch (error) {
    console.error('Erro Notion getPersonSummary:', error.message || error);
    throw error;
  }
}

async function getDailySaldo() {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const filter = {
      and: [
        { property: 'Data', date: { on_or_after: firstDay } },
        { property: 'Data', date: { on_or_before: lastDay } }
      ]
    };

    const pages = await queryAllPages(filter);
    const dailyMap = {};

    for (const page of pages) {
      const item = convertTransaction(page);
      if (!item.date) continue;
      const day = item.date.slice(8, 10);
      if (!dailyMap[day]) dailyMap[day] = 0;
      dailyMap[day] += item.type === 'entrada' ? item.value : -item.value;
    }

    // Acumula o saldo dia a dia
    let accumulated = 0;
    return Object.keys(dailyMap).sort().map(day => {
      accumulated += dailyMap[day];
      return { day, saldo: Math.round(accumulated * 100) / 100 };
    });
  } catch (error) {
    console.error('Erro Notion getDailySaldo:', error.message || error);
    throw error;
  }
}

module.exports = {
  createTransaction,
  findTransactionByShortId,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
  getMonthlyHistory,
  getPersonSummary,
  getDailySaldo
};

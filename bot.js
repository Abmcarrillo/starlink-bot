require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Improved Google Sheets authentication
async function loadSheet() {
  try {
    // Create JWT client for authentication
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    // Initialize and load the document
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`✅ Google Sheet loaded: ${doc.title}`);
    return doc.sheetsByIndex[0]; // Use the first sheet
  } catch (error) {
    console.error('❌ Error loading Google Sheets:', error.message, error.stack);
    throw new Error('Failed to connect to Google Sheets.');
  }
}

// Bot commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🔍 Send me your Starlink kit number, serial number, or organization name"
  );
});

// Message handler
bot.on('message', async (msg) => {
  if (msg.text.startsWith('/')) return; // Ignore commands

  try {
    const sheet = await loadSheet();
    const rows = await sheet.getRows();

    console.log(`🔍 Searching for: ${msg.text}`);
    const query = msg.text.trim().toLowerCase();
    const result = rows.find(row =>
      (row['Número de kit'] || '').toLowerCase() === query ||
      (row['Número de serie'] || '').toLowerCase() === query ||
      (row['Nombre'] || '').toLowerCase().includes(query)
    );

    if (result) {
      const usage = (result['Uso de datos mensuales'] || '0/0').split('/');
      const response = [
        `📡 *${result['Nombre']}*`,
        ``,
        `• *ID:* ${result['ID Starlink'] || 'N/A'}`,
        `• *Kit:* ${result['Número de kit'] || 'N/A'}`,
        `• *Serie:* ${result['Número de serie'] || 'N/A'}`,
        `• *Data:* ${usage[0].trim()} of ${usage[1].trim()}`,
        `• *Software:* ${result['Versión Software'] || 'N/A'}`,
        `• *Active:* ${result['Tiempo Actividad'] || 'N/A'}`,
        `🔗 [Dashboard](${result['Enlace'] || '#'})`
      ].join('\n');

      bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(msg.chat.id, '❌ Not found. Please check your kit number, serial number, or organization name.');
    }
  } catch (error) {
    console.error('⚠️ Error processing request:', error.message, error.stack);
    bot.sendMessage(msg.chat.id, '⚠️ Error processing your request. Please try again later.');
  }
});

console.log('🤖 Bot started successfully');

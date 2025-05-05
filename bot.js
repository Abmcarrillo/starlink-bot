require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true});

// Configuración de Google Sheets
const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL
};

async function loadSheet() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  return doc.sheetsByIndex[0];
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🔍 Envíame el número de kit, serie o nombre de tu organización Starlink");
});

bot.on('message', async (msg) => {
  if (msg.text.startsWith('/')) return;
  
  try {
    const sheet = await loadSheet();
    const rows = await sheet.getRows();
    
    const query = msg.text.trim().toLowerCase();
    const result = rows.find(row => 
      (row['Número de kit'] || '').toLowerCase() === query ||
      (row['Número de serie'] || '').toLowerCase() === query ||
      (row['Nombre'] || '').toLowerCase().includes(query)
    );
    
    if (result) {
      const usage = result['Uso de datos mensuales'].split('/');
      const response = [
        `📡 *${result['Nombre']}*`,
        ``,
        `• *ID:* ${result['ID Starlink']}`,
        `• *Kit:* ${result['Número de kit']}`,
        `• *Serie:* ${result['Número de serie']}`,
        `• *Datos:* ${usage[0].trim()} de ${usage[1].trim()}`,
        `• *Software:* ${result['Versión Software']}`,
        `• *Activo:* ${result['Tiempo Actividad']}`,
        `🔗 [Panel de control](${result['Enlace']})`
      ].join('\n');
      
      bot.sendMessage(msg.chat.id, response, {parse_mode: 'Markdown'});
    } else {
      bot.sendMessage(msg.chat.id, '❌ No encontrado. Verifica tu número de kit, serie o nombre');
    }
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(msg.chat.id, '⚠️ Error al procesar tu solicitud');
  }
});

console.log('🤖 Bot iniciado correctamente');
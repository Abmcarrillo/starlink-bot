require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Verificar variables de entorno al inicio
if (!process.env.TELEGRAM_TOKEN) {
  console.error('❌ TELEGRAM_TOKEN no está configurado.');
  process.exit(1);
}
if (!process.env.GOOGLE_PROJECT_ID) {
  console.error('❌ GOOGLE_PROJECT_ID no está configurado.');
  process.exit(1);
}
if (!process.env.GOOGLE_PRIVATE_KEY) {
  console.error('❌ GOOGLE_PRIVATE_KEY no está configurado.');
  process.exit(1);
}
if (!process.env.GOOGLE_CLIENT_EMAIL) {
  console.error('❌ GOOGLE_CLIENT_EMAIL no está configurado.');
  process.exit(1);
}
if (!process.env.GOOGLE_SHEET_ID) {
  console.error('❌ GOOGLE_SHEET_ID no está configurado.');
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Configuración de Google Sheets
const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL
};

// Función para cargar la hoja de Google Sheets
async function loadSheet() {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    return doc.sheetsByIndex[0]; // Usar la primera hoja
  } catch (error) {
    console.error('❌ Error al cargar Google Sheets:', error);
    throw new Error('No se pudo conectar con Google Sheets.');
  }
}

// Comando /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🔍 Envíame el número de kit, serie o nombre de tu organización Starlink"
  );
});

// Manejo de mensajes
bot.on('message', async (msg) => {
  if (msg.text.startsWith('/')) return; // Ignorar comandos

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
      const usage = (result['Uso de datos mensuales'] || '0/0').split('/');
      const response = [
        `📡 *${result['Nombre']}*`,
        ``,
        `• *ID:* ${result['ID Starlink'] || 'N/A'}`,
        `• *Kit:* ${result['Número de kit'] || 'N/A'}`,
        `• *Serie:* ${result['Número de serie'] || 'N/A'}`,
        `• *Datos:* ${usage[0].trim()} de ${usage[1].trim()}`,
        `• *Software:* ${result['Versión Software'] || 'N/A'}`,
        `• *Activo:* ${result['Tiempo Actividad'] || 'N/A'}`,
        `🔗 [Panel de control](${result['Enlace'] || '#'})`
      ].join('\n');

      bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(msg.chat.id, '❌ No encontrado. Verifica tu número de kit, serie o nombre.');
    }
  } catch (error) {
    console.error('⚠️ Error procesando la solicitud:', error);
    bot.sendMessage(msg.chat.id, '⚠️ Error al procesar tu solicitud. Intenta más tarde.');
  }
});

console.log('🤖 Bot iniciado correctamente');

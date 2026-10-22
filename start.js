/**
 * Ujednolicony plik startowy - konsolidacja logiki z start.js, bot.js, start-all.js
 */
'use strict';
require('dotenv').config();

const constants = require('./config/constants');

// Helper function dla bezpiecznego logowania błędów
function logError(context, error) {
  const message = error?.message || error || 'Unknown error';
  console.error(`[${context}]`, message);
  if (process.env.NODE_ENV === 'development' && error?.stack) {
    console.error(error.stack);
  }
}

// Helper function dla bezpiecznego startowania modułów
async function safeStart(moduleName, startFn, context) {
  try {
    const result = await startFn();
    console.log(`✅ ${context} started`);
    return result;
  } catch (error) {
    logError(context, error);
    return null;
  }
}

// Start bot services
(async () => {

  // Start Telegram bot
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const ALERT_USER_ID = process.env.ALERT_USER_ID ? Number(process.env.ALERT_USER_ID) : null;
  let telegramBot = null;
  let discordBot = null;
  
  if (TELEGRAM_TOKEN) {
    try {
      // Próbuj najpierw telegramHandler (nowszy), potem telegram (starszy)
      try {
        const startTelegram = require('./handlers/telegramHandler');
        if (startTelegram) {
          // Zawsze używaj telegramHandler, przekaż token jeśli dostępny
          telegramBot = startTelegram(TELEGRAM_TOKEN || undefined, ALERT_USER_ID || undefined);
        }
      } catch (error) {
        // Fallback do starszego handlera tylko w przypadku błędu
        try {
          const startTelegram = require('./handlers/telegram');
          if (startTelegram) telegramBot = startTelegram();
        } catch (fallbackError) {
          logError('Telegram fallback handler', fallbackError);
        }
      }
      
      // Nie loguj tutaj - telegramHandler już loguje "✅ Telegram started"
    } catch (error) {
      logError('Telegram handler', error);
    }
  } else {
    console.log('ℹ️ Telegram not started (TELEGRAM_TOKEN not set)');
  }

  // Start Discord bot
  const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
  if (DISCORD_TOKEN) {
    try {
      const startDiscord = require('./handlers/discordHandler');
      if (startDiscord) {
        discordBot = startDiscord(DISCORD_TOKEN, telegramBot, ALERT_USER_ID);
        console.log('✅ Discord started');
      }
    } catch (error) {
      logError('Discord handler', error);
    }
  } else {
    console.log('ℹ️ Discord not started (DISCORD_TOKEN not set)');
  }

  // Start service node monitor after both bots are initialized
  // Wait a bit for bots to be ready
  setTimeout(() => {
    try {
      const snChatIds = process.env.TELEGRAM_SN_CHAT_IDS;
      const snChannelIds = process.env.DISCORD_SN_CHANNEL_IDS;
      
      const telegramChatIds = snChatIds ? snChatIds.split(',').map(id => id.trim()).filter(Boolean) : [];
      const discordChannelIds = snChannelIds ? snChannelIds.split(',').map(id => id.trim()).filter(Boolean) : [];
      
      if (telegramChatIds.length > 0 || discordChannelIds.length > 0) {
        const { startMonitoring } = require('./services/serviceNodeMonitor');
        startMonitoring(telegramBot, telegramChatIds, discordBot, discordChannelIds);
      }
    } catch (e) {
      console.error('Error starting service node monitor:', e.message || e);
    }
  }, 5000); // Wait 5 seconds for bots to be ready

  console.log('🤖 Bot module loaded.');
})();

const TelegramBot = require('node-telegram-bot-api');

// Statyczne require zamiast dynamicznego - lepsza wydajność i wcześniejsze wykrywanie błędów
const helpme = require('../commands/helpme');
const links = require('../commands/links');
const nodes = require('../commands/nodes');

// Opcjonalne komendy (mogą nie istnieć)
let network, daemon_info, pools, zmqdiag, sn, trade;
try { network = require('../commands/network'); } catch {}
try { daemon_info = require('../commands/daemon_info'); } catch {}
try { pools = require('../commands/pools'); } catch {}
try { zmqdiag = require('../commands/zmqdiag'); } catch {}
try { sn = require('../commands/sn'); } catch {}
try { trade = require('../commands/trade'); } catch {}

function sendChunks(bot, chatId, text){
  if (!text) return;
  const limit=3800;
  
  // Funkcja do bezpiecznego wysyłania z fallback na plain text
  const safeSend = async (chunk, attempt = 0) => {
    try {
      // Próbuj z Markdown
      await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (e) {
      if (e.message && e.message.includes('parse entities')) {
        // Jeśli błąd parsowania, wyślij jako plain text
        try {
          await bot.sendMessage(chatId, chunk, { disable_web_page_preview: true });
        } catch (e2) {
          console.error('Error sending plain text message:', e2.message || e2);
        }
      } else {
        throw e; // Rzuć dalej inne błędy
      }
    }
  };
  
  // Podziel na chunki i wyślij
  for (let i=0;i<text.length;i+=limit){
    const chunk = text.slice(i,i+limit);
    safeSend(chunk).catch(e => {
      console.error('Error in sendChunks:', e.message || e);
    });
  }
}

// Singleton - zapobiegaj wielokrotnemu uruchomieniu
let botInstance = null;

module.exports = function startTelegram(tokenParam, alertUserIdParam){
  // Jeśli bot już jest uruchomiony, zwróć istniejącą instancję
  if (botInstance) {
    console.log('⚠️  Telegram bot already running, returning existing instance');
    return botInstance;
  }
  
  // Obsługa parametrów (dla kompatybilności z bot.js, start-all.js)
  const token = tokenParam || process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.log('⚠️  TELEGRAM_TOKEN not set – Telegram disabled.'); return null; }
  
  try {
    const bot = new TelegramBot(token, { polling: true });
    botInstance = bot; // Zapisz instancję
  
  // Logowanie wszystkich wiadomości dla debugowania
  bot.on('message', (msg) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Telegram] Message from ${msg.from?.username || msg.from?.id} in chat ${msg.chat.id}: ${msg.text?.substring(0, 50)}`);
    }
  });
  
  const wrap = (fn)=>(async (msg, match)=>{
    if (!fn) return;
    const reply = async (t)=>{
      try {
        await sendChunks(bot, msg.chat.id, t);
      } catch (e) {
        console.error('Error sending message:', e.message || e);
      }
    };
    const args = (match && match[1]) || '';
    try{ 
      const result = await fn({ reply, from: msg.from || {}, args });
      // Jeśli funkcja zwraca string zamiast używać reply, wyślij go
      if (result && typeof result === 'string' && result.trim()) {
        await reply(result);
      }
    }
    catch(e){ 
      console.error('Telegram handler error:', e);
      try {
        await bot.sendMessage(msg.chat.id, '❌ Wystąpił błąd podczas wykonywania komendy.');
      } catch {}
    }
  });

  bot.onText(/^\/helpme(?:@.+)?$/i, wrap(async ({ reply }) => {
    // helpme używa reply() wewnątrz, więc nie zwracamy tekstu
    await helpme({ reply });
  }));
  bot.onText(/^\/links(?:@.+)?$/i, wrap(async ({ reply }) => {
    const result = links();
    const text = Array.isArray(result) ? result.join('\n') : (result || '');
    if (text && typeof text === 'string') return text;
  }));
  bot.onText(/^\/nodes(?:@.+)?$/i, wrap(async ({ reply }) => {
    const text = await nodes();
    if (text && typeof text === 'string') return text;
  }));

  // Opcjonalne komendy
  if (network) bot.onText(/^\/network(?:@.+)?$/i, wrap(async ({ reply }) => {
    const text = await network();
    if (text && typeof text === 'string') return text;
  }));
  if (daemon_info) bot.onText(/^\/daemon_info(?:@.+)?$/i, wrap(async ({ reply }) => {
    const text = await daemon_info();
    if (text && typeof text === 'string') return text;
  }));
  if (pools) bot.onText(/^\/pools(?:@.+)?$/i, wrap(async ({ reply }) => {
    const text = await pools();
    if (text && typeof text === 'string') return text;
  }));
  if (zmqdiag) bot.onText(/^\/zmqdiag(?:@.+)?\s*(.*)$/i, wrap(async (ctx) => {
    const text = await zmqdiag(ctx);
    if (text && typeof text === 'string') return text;
  }));
  if (sn) bot.onText(/^\/sn(?:@.+)?$/i, wrap(async ({ reply }) => {
    const text = await sn();
    if (text && typeof text === 'string') return text;
  }));
  if (trade) bot.onText(/^\/trade(?:@.+)?$/i, wrap(async ({ reply }) => {
    const text = await trade();
    if (text && typeof text === 'string') return text;
  }));

    console.log('✅ Telegram started');
    
    // Service node monitor will be started from start.js after both bots are ready
    // to avoid duplicate monitoring
    
    // Obsługa błędów polling
    bot.on('polling_error', (error) => {
      console.error('[Telegram Polling Error]', error.message || error);
      if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
        console.error('⚠️  Multiple bot instances detected! Make sure only one instance is running.');
        console.error('   Stopping this instance to prevent conflicts...');
        bot.stopPolling();
        botInstance = null;
      }
    });
    
    return bot;
  } catch (error) {
    console.error('Error creating Telegram bot:', error.message || error);
    botInstance = null;
    return null;
  }
};

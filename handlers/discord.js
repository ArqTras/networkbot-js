const { Client, GatewayIntentBits } = require('discord.js');
module.exports = async function startDiscord(){
  const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
  if (!token){ console.log('⚠️  DISCORD_TOKEN not set – Discord disabled.'); return null; }
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  client.on('ready', ()=> console.log('✅ Discord started'));
  client.login(token).catch(e=>console.log('Discord login failed:', e.message||e));
  return client;
};

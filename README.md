# ArQmA Network Bot (v3.5.0)

- ZMQ-RPC first (tcp://HOST:19995), header/version fallbacks; HTTP fallback on 19994/19998.
- Admin: /restrict & /unrestrict; /zmqdiag diagnostics.
- **/sn** (Telegram) / **!sn** (Discord): Service nodes - open nodes & reward share
- Automatic monitoring of new open service nodes with Telegram notifications

## Setup
1) `npm install`
2) Fill `.env`
3) Ensure daemons expose **ZMQ-RPC on 19995** and HTTP on **19994** (or pool on 19998)
4) `npm start`

## Service Node Monitoring

Bot może automatycznie monitorować i powiadamiać o nowych otwartych service nodes (dostępnych do contribucji) na kanały Telegram i/lub Discord.

### Konfiguracja

Dodaj do `.env`:
```
TELEGRAM_SN_CHAT_IDS=-1001234567890,-1009876543210
DISCORD_SN_CHANNEL_IDS=1234567890123456789,9876543210987654321
SN_CHECK_INTERVAL_MS=600000
```

- `TELEGRAM_SN_CHAT_IDS` - Lista ID kanałów/grup Telegram oddzielonych przecinkami (opcjonalne)
- `DISCORD_SN_CHANNEL_IDS` - Lista ID kanałów Discord oddzielonych przecinkami (opcjonalne)
- `SN_CHECK_INTERVAL_MS` - Interwał sprawdzania w milisekundach (domyślnie 600000 = 10 minut)

Możesz skonfigurować tylko Telegram, tylko Discord, lub oba jednocześnie.

### Jak znaleźć ID kanału/grupy?

**Telegram - Metoda 1 (API):**
1. Dodaj bota do kanału/grupy jako administrator
2. Wyślij wiadomość na kanale/grupie (może być dowolna wiadomość)
3. Otwórz w przeglądarce: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Zastąp `<TOKEN>` swoim tokenem bota (np. `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. W odpowiedzi JSON znajdź sekcję `"chat"` → `"id"`
   - Dla kanałów będzie ujemne, np. `-1001234567890`
   - Dla grup również będzie ujemne
   - Dla prywatnych rozmów będzie dodatnie

**Telegram - Metoda 2 (Bot @userinfobot):**
1. Dodaj bota @userinfobot do swojego kanału/grupy
2. Wyślij w kanale/grupie komendę `/start`
3. Bot wyświetli informacje o kanale/grupie, w tym `Chat ID`

**Telegram - Metoda 3 (Bot @RawDataBot):**
1. Dodaj bota @RawDataBot do swojego kanału/grupy
2. Wyślij w kanale/grupie dowolną wiadomość
3. Bot wyśle surowe dane JSON z informacjami o kanale, w tym `chat.id`

**Telegram - Metoda 4 (Własny bot):**
Możesz też dodać tymczasową komendę do swojego bota:
```javascript
bot.on('message', (msg) => {
  if (msg.text === '/getchatid') {
    bot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`);
  }
});
```
Następnie wyślij `/getchatid` w kanale/grupie.

**Discord:**
1. Włącz tryb deweloperski w Discord (Ustawienia → Zaawansowane → Tryb deweloperski)
2. Kliknij prawym przyciskiem na kanał → Kopiuj ID
3. Użyj tego ID w `DISCORD_SN_CHANNEL_IDS`
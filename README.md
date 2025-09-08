# ArQmA Network Bot (ZMQ-RPC first, robust)

- Primary data via ZMQ-RPC `tcp://HOST:19995` for `/nodes` and `/daemon_info`.
- If `get_info` top hash is zero/missing, the bot calls `get_last_block_header` and uses that hash.
- If version is missing, the bot calls `get_version` and normalizes it (e.g., `major.minor`).
- Correct hashrate: `difficulty / target` (fallback `target = 120s`).
- HTTP fallback only if ZMQ-RPC yields no meaningful data.
- `/restrict <@user|id>` (admin) restricts a user for 24h — enforced on Telegram & Discord; logs to `data/restricted.txt`.
- **`/unrestrict <@user|id>` (admin)** removes the restriction immediately.
- `/zmqdiag <NodeName>` for admin diagnostics (pattern used + raw JSON pretty).

## Setup

1) `node generate-structure.js`  
2) `npm install`  
3) Fill `.env`  
4) Run daemons with:
   ```
   --zmq-rpc-bind-ip 0.0.0.0 --zmq-rpc-bind-port 19995
   ```
5) Open TCP 19995  
6) Edit `config/nodeList.js` with public hosts  
7) `npm start`

## Notes

- `/nodes` and `/daemon_info` use ZMQ-RPC first; if the endpoint does not answer with meaningful JSON, an HTTP `/get_info` fallback is used.
- Telegram messages are sent as plain text; diagnostics are wrapped in HTML `<pre>` with escaping to avoid Markdown parse errors.

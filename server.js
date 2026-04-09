// ============================================================
//  Relay Server — host this FREE on glitch.com or render.com
//  This is needed because Roblox can't receive inbound HTTP,
//  so the bot pushes commands here, and Roblox polls here.
// ============================================================

const express = require('express');
const app = express();
app.use(express.json());

const SECRET = process.env.SECRET_KEY || 'Ikeeasianboy123zx';

let pendingCommands = [];  // queue of commands waiting for Roblox
let results = {};          // commandId -> result

// Discord bot POSTs a command here
app.post('/command', (req, res) => {
  const { secret, action, username, reason } = req.body;
  if (secret !== SECRET) return res.status(403).json({ error: 'Forbidden' });

  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  pendingCommands.push({ id, action, username, reason: reason || '' });

  // Wait up to 15 seconds for Roblox to pick it up and respond
  const timeout = setTimeout(() => {
    delete results[id];
    res.status(504).json({ error: 'Roblox server timed out' });
  }, 15000);

  const interval = setInterval(() => {
    if (results[id] !== undefined) {
      clearTimeout(timeout);
      clearInterval(interval);
      const result = results[id];
      delete results[id];
      res.json(result);
    }
  }, 300);
});

// Roblox polls here for pending commands
app.get('/pending', (req, res) => {
  if (req.query.secret !== SECRET) return res.status(403).json({ error: 'Forbidden' });
  const cmds = [...pendingCommands];
  pendingCommands = [];
  res.json({ commands: cmds });
});

// Roblox acknowledges a command with the result
app.post('/ack', (req, res) => {
  const { secret, id, ...data } = req.body;
  if (secret !== SECRET) return res.status(403).json({ error: 'Forbidden' });
  results[id] = data;
  res.json({ ok: true });
});

app.get('/', (req, res) => res.send('Ban relay is running ✅'));

app.listen(3000, () => console.log('Relay running on port 3000'));

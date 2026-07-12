require('dotenv').config();
const express = require('express');
const { appendOrderRow } = require('./sheets');
const { extractOrderFields } = require('./parseOrder');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Meta calls this once when you configure the webhook URL, to prove you control it.
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified by Meta.');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Meta posts every incoming message / status update here.
app.post('/webhook', async (req, res) => {
  // Acknowledge immediately — Meta retries aggressively if this is slow or non-2xx.
  res.sendStatus(200);

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const messages = value.messages || [];
        if (!messages.length) continue; // e.g. delivery/read status updates — nothing to log

        const contacts = value.contacts || [];
        for (const msg of messages) {
          await handleIncomingMessage(msg, contacts);
        }
      }
    }
  } catch (err) {
    console.error('Error processing webhook payload:', err);
  }
});

async function handleIncomingMessage(msg, contacts) {
  if (msg.type !== 'text') {
    console.log(`Skipping non-text message (${msg.type}) from ${msg.from}`);
    return;
  }

  const text = msg.text?.body || '';
  if (!text.trim()) return;

  const contact = contacts.find((c) => c.wa_id === msg.from);
  const senderName = contact?.profile?.name || '';
  const timestamp = new Date(Number(msg.timestamp) * 1000).toISOString();

  const parsed = await extractOrderFields(text);

  await appendOrderRow({
    timestamp,
    phone: msg.from,
    senderName,
    rawMessage: text,
    customerName: parsed.customerName || '',
    product: parsed.product || '',
    quantity: parsed.quantity || '',
    area: parsed.area || '',
  });

  console.log(`Logged order from ${senderName || msg.from}`);
}

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});

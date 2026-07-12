let anthropicClient;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// Best-effort structured extraction from a free-text WhatsApp message.
// Returns {} (leaving sheet columns blank) if no API key is set or parsing fails,
// so a missing/invalid key never blocks logging the raw message.
async function extractOrderFields(text) {
  const client = getClient();
  if (!client) return {};

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Extract order details from this WhatsApp message as compact JSON with keys ` +
          `customerName, product, quantity, area. Use an empty string for any field not mentioned. ` +
          `Reply with ONLY the JSON object, nothing else.\n\nMessage: """${text}"""`,
      }],
    });

    const raw = response.content?.[0]?.text?.trim() || '{}';
    return JSON.parse(raw);
  } catch (err) {
    console.error('AI parsing failed, falling back to raw message only:', err.message);
    return {};
  }
}

module.exports = { extractOrderFields };

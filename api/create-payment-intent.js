import crypto from "crypto";

/**
 * Minimal helper: read raw request body and parse JSON if application/json
 */
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  try {
    return { body: JSON.parse(raw), raw };
  } catch (e) {
    return { body: null, raw };
  }
}

/**
 * Simple in-memory token cache — works for warm serverless instances.
 * (Serverless instances may be cold-started; that's OK.)
 */
let cachedToken = null;
let tokenExpiryMs = 0;
const AIRWALLEX_API_BASE = process.env.AIRWALLEX_API_BASE || "https://api-demo.airwallex.com";
const CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID;
const API_KEY = process.env.AIRWALLEX_API_KEY;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiryMs) return cachedToken;

  const res = await fetch(`${AIRWALLEX_API_BASE}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "x-client-id": CLIENT_ID,
      "x-api-key": API_KEY
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Auth failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  // the exact field name may be `token` or `access_token` depending on API version — adjust if needed.
  const token = data.access_token || data.token || data.accessToken;
  const expiresIn = data.expires_in || 3600;
  cachedToken = token;
  tokenExpiryMs = now + (expiresIn - 60) * 1000;
  return token;
}

export default async function handler(req, res) {
  // Allow simple CORS for your frontend during dev — lock this down for prod
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { body } = await readJson(req);
    const amount = body?.amount;
    const currency = body?.currency || "USD";
    if (!amount) return res.status(400).json({ error: "amount is required (in smallest unit e.g. cents)" });

    const token = await getAccessToken();

    const piResp = await fetch(`${AIRWALLEX_API_BASE}/api/v1/pa/payment_intents/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        request_id: crypto.randomUUID(),
        amount,
        currency,
        merchant_order_id: `order_${Date.now()}`,
        order: { items: [{ name: "Sample item", quantity: 1, amount }] }
      })
    });

    const piData = await piResp.json();
    if (!piResp.ok) return res.status(500).json({ error: "Airwallex create PI failed", details: piData });

    return res.status(200).json({
      intent_id: piData.id,
      client_secret: piData.client_secret
    });
  } catch (err) {
    console.error("create-payment-intent error:", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}

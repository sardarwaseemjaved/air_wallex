export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { amount, currency, customer_id } = req.body;
    if (!amount || !currency || !customer_id) {
      return res.status(400).json({ error: "amount, currency, and customer_id are required" });
    }

    // 1. Authenticate
    const loginResp = await fetch("https://api-demo.airwallex.com/api/v1/authentication/login", {
      method: "POST",
      headers: {
        "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
        "x-api-key": process.env.AIRWALLEX_API_KEY,
        "Content-Type": "application/json",
      },
    });
    const loginJson = await loginResp.json();
    if (!loginResp.ok) {
      return res.status(loginResp.status).json({ error: "Authentication failed", details: loginJson });
    }

    const accessToken = loginJson.token || loginJson.access_token;
    if (!accessToken) return res.status(500).json({ error: "No access token" });

    // 2. Create Payment Intent
    const piResp = await fetch("https://api-demo.airwallex.com/api/v1/pa/payment_intents/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request_id: `req_${Date.now()}`,
        merchant_order_id: `order_${Date.now()}`, // 🔑 required by Airwallex
        amount,
        currency,
        customer_id,
        order: {
          items: [
            {
              name: "Demo Item",
              quantity: 1,
              amount,
            },
          ],
        },
      }),
    });

    const piJson = await piResp.json();
    if (!piResp.ok) {
      return res.status(piResp.status).json({ error: "Create payment intent failed", details: piJson });
    }

    return res.status(200).json({
      intent_id: piJson.id,
      client_secret: piJson.client_secret,
    });
  } catch (err) {
    console.error("create-payment-intent error:", err);
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
}

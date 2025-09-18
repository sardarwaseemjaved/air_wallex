export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.warn("[create-payment-intent] Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, currency, customer_id } = req.body;
    console.log("[create-payment-intent] Incoming request body:", req.body);

    if (!amount || !currency || !customer_id) {
      console.error("[create-payment-intent] Missing required fields", { amount, currency, customer_id });
      return res.status(400).json({ error: "amount, currency, and customer_id are required" });
    }

    // 1. Authenticate
    console.log("[create-payment-intent] Step 1: Authenticating with Airwallex…");
    const loginResp = await fetch("https://api-demo.airwallex.com/api/v1/authentication/login", {
      method: "POST",
      headers: {
        "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
        "x-api-key": process.env.AIRWALLEX_API_KEY,
        "Content-Type": "application/json",
      },
    });

    const loginJson = await loginResp.json();
    console.log("[create-payment-intent] Auth response received");

    if (!loginResp.ok) {
      console.error("[create-payment-intent] Authentication failed", { status: loginResp.status, body: loginJson });
      return res.status(loginResp.status).json({ error: "Authentication failed", details: loginJson });
    }

    const accessToken = loginJson.token || loginJson.access_token;
    if (!accessToken) {
      console.error("[create-payment-intent] Missing access token in auth response", loginJson);
      return res.status(500).json({ error: "No access token" });
    }

    console.log("[create-payment-intent] Authentication successful");

    // 2. Create Payment Intent
    const request_id = `req_${Date.now()}`;
    const merchant_order_id = `order_${Date.now()}`;
    console.log("[create-payment-intent] Step 2: Creating PaymentIntent", {
      request_id,
      merchant_order_id,
      amount,
      currency,
      customer_id,
    });

    const piResp = await fetch("https://api-demo.airwallex.com/api/v1/pa/payment_intents/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request_id,
        merchant_order_id,
        amount,
        currency,
        customer_id,
      }),
    });

    const piJson = await piResp.json();
    console.log("[create-payment-intent] PaymentIntent API responded");

    if (!piResp.ok) {
      console.error("[create-payment-intent] Failed to create payment intent", { status: piResp.status, body: piJson });
      return res.status(piResp.status).json({ error: "Create payment intent failed", details: piJson });
    }

    console.log("[create-payment-intent] PaymentIntent created successfully", {
      intent_id: piJson.id,
      client_secret: piJson.client_secret,
    });

    return res.status(200).json({
      intent_id: piJson.id,
      client_secret: piJson.client_secret,
    });
  } catch (err) {
    console.error("[create-payment-intent] Unexpected error:", { message: err.message, stack: err.stack });
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
}

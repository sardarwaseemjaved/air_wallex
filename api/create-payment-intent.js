import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, currency, customer_id } = req.body;
    console.log("[create-payment-intent] Request body:", req.body);

    const response = await fetch("https://api-demo.airwallex.com/api/v1/authentication/login", {
      method: "POST",
      headers: {
        "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
        "x-api-key": process.env.AIRWALLEX_API_KEY,
        "Content-Type": "application/json",
      },
    });

    const { token } = await response.json();
    console.log("[create-payment-intent] Auth token received");

    const paymentIntentResponse = await fetch("https://api-demo.airwallex.com/api/v1/pa/payment_intents/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request_id: `req_${Date.now()}`,
        amount,
        currency,
        customer_id,
      }),
    });

    const data = await paymentIntentResponse.json();
    console.log("[create-payment-intent] Response from Airwallex:", data);

    return res.status(200).json({
      intent_id: data.id,
      client_secret: data.client_secret,
    });
  } catch (err) {
    console.error("[create-payment-intent] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

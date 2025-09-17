export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { customerId } = req.body;

  try {
    const response = await fetch("https://api.airwallex.com/api/v1/pa/payment_intents/create_customer_client_secret", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AIRWALLEX_API_KEY}`,
      },
      body: JSON.stringify({ customer_id: customerId }),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

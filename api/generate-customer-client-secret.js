import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customer_id } = req.body;
    console.log("[generate-customer-client-secret] Request body:", req.body);

    const response = await fetch("https://api-demo.airwallex.com/api/v1/authentication/login", {
      method: "POST",
      headers: {
        "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
        "x-api-key": process.env.AIRWALLEX_API_KEY,
        "Content-Type": "application/json",
      },
    });

    const { token } = await response.json();
    console.log("[generate-customer-client-secret] Auth token received");

    const clientSecretResponse = await fetch(
      `https://api-demo.airwallex.com/api/v1/customers/${customer_id}/create_client_secret`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const data = await clientSecretResponse.json();
    console.log("[generate-customer-client-secret] Response from Airwallex:", data);

    return res.status(200).json(data);
  } catch (err) {
    console.error("[generate-customer-client-secret] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

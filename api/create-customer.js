export const config = {
  api: {
    bodyParser: true, // regular JSON body
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { merchant_customer_id } = req.body;
    console.log("[create-customer] body:", req.body);

    if (!merchant_customer_id) {
      return res.status(400).json({ error: "merchant_customer_id is required" });
    }

    // 1. Authenticate login
    const loginResp = await fetch("https://api-demo.airwallex.com/api/v1/authentication/login", {
      method: "POST",
      headers: {
        "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
        "x-api-key": process.env.AIRWALLEX_API_KEY,
        "Content-Type": "application/json",
      }
    });

    const loginJson = await loginResp.json();
    console.log("[create-customer] login response status:", loginResp.status, "body:", loginJson);

    if (!loginResp.ok) {
      return res.status(loginResp.status).json({ error: "Authentication failed", details: loginJson });
    }

    const accessToken = loginJson.token || loginJson.access_token;
    if (!accessToken) {
      return res.status(500).json({ error: "No access token in login response" });
    }

    console.log("[create-customer] got access token");

    // 2. Call Create Customer endpoint
    const custResp = await fetch("https://api-demo.airwallex.com/api/v1/pa/customers/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request_id: `req_${Date.now()}`,
        merchant_customer_id
      })
    });

    const custJson = await custResp.json();
    console.log("[create-customer] customer response status:", custResp.status, "body:", custJson);

    if (!custResp.ok) {
      return res.status(custResp.status).json({ error: "Customer creation failed", details: custJson });
    }

    // 3. Return created customer object
    return res.status(200).json(custJson);

  } catch (err) {
    console.error("[create-customer] error:", err);
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
}
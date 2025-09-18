export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { merchant_customer_id } = req.body;
        if (!merchant_customer_id) return res.status(400).json({ error: "merchant_customer_id is required" });

        // 1. Get access token
        const loginResp = await fetch("https://api-demo.airwallex.com/api/v1/authentication/login", {
            method: "POST",
            headers: {
                "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
                "x-api-key": process.env.AIRWALLEX_API_KEY,
                "Content-Type": "application/json",
            },
        });
        const loginJson = await loginResp.json();
        if (!loginResp.ok) return res.status(loginResp.status).json({ error: "Authentication failed", details: loginJson });

        const accessToken = loginJson.token || loginJson.access_token;
        if (!accessToken) return res.status(500).json({ error: "No access token" });

        // 2. Create customer
        const custResp = await fetch("https://api-demo.airwallex.com/api/v1/pa/customers/create", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                request_id: `req_${Date.now()}`,
                merchant_customer_id,
            }),
        });
        const custJson = await custResp.json();
        if (!custResp.ok) return res.status(custResp.status).json({ error: "Create customer failed", details: custJson });

        // 3. Generate client_secret for that customer
        const clientSecretUrl = `https://api-demo.airwallex.com/api/v1/pa/customers/${custJson.id}/generate_client_secret`;
        const csResp = await fetch(clientSecretUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });
        const csJson = await csResp.json();
        if (!csResp.ok) return res.status(csResp.status).json({ error: "Generate client secret failed", details: csJson });

        // Return both
        return res.status(200).json({
            customer: custJson,
            client_secret: csJson.client_secret,  // according to docs: response has client_secret
        });
    } catch (err) {
        console.error("create-customer flow error:", err);
        return res.status(500).json({ error: "Internal server error", message: err.message });
    }
}
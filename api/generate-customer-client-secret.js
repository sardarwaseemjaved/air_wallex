export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const { customer_id } = req.query;
    if (!customer_id) return res.status(400).json({ error: "customer_id is required" });

    try {
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

        const csUrl = `https://api-demo.airwallex.com/api/v1/pa/customers/${customer_id}/generate_client_secret`;
        const csResp = await fetch(csUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${accessToken}` },
        });
        const csJson = await csResp.json();
        if (!csResp.ok) return res.status(csResp.status).json({ error: "Generate client secret failed", details: csJson });

        return res.status(200).json({ client_secret: csJson.client_secret });
    } catch (err) {
        console.error("generate-client-secret error:", err);
        return res.status(500).json({ error: "Internal server error", message: err.message });
    }
}
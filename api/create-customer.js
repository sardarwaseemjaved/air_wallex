export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        console.log("[create-customer] Request body:", req.body);
        const { merchant_customer_id } = req.body;

        if (!merchant_customer_id) {
            return res.status(400).json({ error: "merchant_customer_id is required" });
        }

        // 1. Authenticate with Airwallex
        const authResp = await fetch("https://api-demo.airwallex.com/api/v1/authentication/login", {
            method: "POST",
            headers: {
                "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
                "x-api-key": process.env.AIRWALLEX_API_KEY,
                "Content-Type": "application/json",
            },
        });

        const { token } = await authResp.json();
        console.log("[create-customer] Auth token received");

        // 2. Create customer in Airwallex (only required fields)
        const customerResp = await fetch("https://api-demo.airwallex.com/api/v1/customers/create", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                request_id: `req_${Date.now()}`,
                merchant_customer_id,
            }),
        });

        const data = await customerResp.json();
        console.log("[create-customer] Response from Airwallex:", data);

        if (!customerResp.ok) {
            return res.status(customerResp.status).json(data);
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error("[create-customer] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
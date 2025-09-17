export const config = {
  api: {
    bodyParser: false, // Required for raw signature verification
  },
};

import getRawBody from "raw-body";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["x-airwallex-signature"];
    const secret = process.env.AIRWALLEX_WEBHOOK_SECRET;

    // ✅ Verify signature (based on Airwallex docs)
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(rawBody.toString());
    console.log("🔔 Received webhook:", event);

    // TODO: handle specific event types (e.g. payment_intent.succeeded)
    if (event.type === "payment_intent.succeeded") {
      console.log("✅ Payment succeeded:", event.data);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
}

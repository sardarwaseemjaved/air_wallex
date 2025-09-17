export default async function handler(req, res) {
  try {
    console.log("[webhook] Headers:", req.headers);
    console.log("[webhook] Body:", req.body);

    // TODO: verify signature using AIRWALLEX_WEBHOOK_SECRET once you have it

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

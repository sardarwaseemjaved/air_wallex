import crypto from "crypto";

const WEBHOOK_SECRET = process.env.AIRWALLEX_WEBHOOK_SECRET;

/**
 * Read the raw body as Buffer (required to verify signatures)
 */
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const raw = await getRawBody(req);
    const ts = req.headers["x-timestamp"] || req.headers["x-timestamp".toLowerCase()];
    const signature = req.headers["x-signature"] || req.headers["x-signature".toLowerCase()];

    if (!ts || !signature || !WEBHOOK_SECRET) {
      console.warn("Missing ts/signature/secret");
      return res.status(400).end("missing headers or secret");
    }

    // expected = HMAC_SHA256( timestamp + rawBody ) using endpoint secret (hex)
    const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(ts + raw.toString()).digest("hex");

    // timing-safe compare
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.warn("Invalid webhook signature", { signature, expected });
      return res.status(400).end("invalid signature");
    }

    const event = JSON.parse(raw.toString());
    console.log("received webhook:", event.type || event.event || "unknown", event);

    // acknowledge early
    res.status(200).end("ok");

    // then do your async business logic (DB update, fulfillment). Example:
    if (event.type === "payment_intent.succeeded" || event.event === "payment_intent.succeeded") {
      const pi = event.data || event.data_object || event;
      // TODO: mark order as paid in DB
      console.log("payment succeeded for:", pi.id || pi.payment_intent_id);
    }
  } catch (err) {
    console.error("webhook handler error:", err);
    return res.status(500).end("error");
  }
}

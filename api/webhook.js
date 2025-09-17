// pages/api/webhook.js (Vercel)
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false, // Important: raw body needed for signature verification
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });

  const timestamp = req.headers["x-timestamp"];
  const signature = req.headers["x-signature"];

  const hmac = crypto.createHmac("sha256", process.env.AIRWALLEX_API_KEY);
  hmac.update(timestamp + rawBody);
  const expectedSig = hmac.digest("hex");

  if (expectedSig !== signature) {
    console.error("Invalid signature");
    return res.status(400).send("Invalid signature");
  }

  const event = JSON.parse(rawBody);
  console.log("Webhook received:", event.type, event.data);

  if (event.type === "webhook.verification") {
    console.log("Webhook verified with code:", event.data.verification_code);
  }

  if (event.type === "payment_intent.succeeded") {
    console.log("Payment succeeded for:", event.data.id);
    // TODO: update your DB
  }

  return res.status(200).send("ok");
}

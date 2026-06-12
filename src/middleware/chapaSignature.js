import crypto from "crypto";
import config from "../config/index.js";
const secretKey = config.CHAPA_WEBHOOK_HASH;

export const verifySignature = (req, res, next) => {
  try {
    const chapaSignature =
      req.headers["Chapa-Signature"] || req.headers["x-chapa-signature"];
    if (!chapaSignature) {
      ///
      console.log("🚫 Missing signature header");
      return res.status(401).json({message: "Unauthorized: Signature missing"});
    }

    if (!req.rawBody) {
      console.log("❌ rawBody is missing");
      return res.status(500).json({message: "rawBody is missing"});
    }

    const computedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(req.rawBody)
      .digest("hex");

    if (chapaSignature !== computedSignature) {
      console.log("🚫 Invalid signature");
      return res.status(401).json({message: "Unauthorized: Invalid signature"});
    }

    next();
  } catch (err) {
    console.error("🔥 Signature verification error:", err);
    return res.status(500).json({message: "Internal Server Error"});
  }
};

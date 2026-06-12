import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import path from "path";
import {fileURLToPath} from "url";

import prisma from "./config/db.js"; // ← Import here
import {stripeWebhook} from "./controller/payment.controller.js";
import {
  runSubscriptionExpirationCheck,
  startSubscriptionExpirationJob,
} from "./jobs/subscriptionExpiration.job.js";
import {errorHandler, notFound} from "./middleware/error.js";
import apiRoutes from "./routes/index.routes.js";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const bodyLimit = process.env.BODY_LIMIT || "10mb";
const uploadsRoot = path.resolve(__dirname, "../uploads");

// Middleware
app.use(cors());
app.use(morgan("dev"));

// for stripe webhook, we need raw body, so we will use express.raw for that specific route
app.post(
  "/api/payment/webhook",
  express.raw({type: "application/json"}),
  stripeWebhook,
);

// for chapa webhook
// ❗ RAW body ONLY for Chapa webhook
app.use(
  express.json({
    limit: bodyLimit,
    verify: (req, res, buf) => {
      // 👇 Capture raw body ONLY for Chapa webhook
      if (req.originalUrl === "/api/payment/chapa-webhook") {
        req.rawBody = buf;
      }
    },
  }),
);

// app.use(express.json());
app.use(express.urlencoded({extended: true, limit: bodyLimit}));

//static folder for uploaded files
app.use("/uploads", express.static(uploadsRoot));

// ✅ Database Connection Check
async function initializeApp() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");

    // Optional: Quick health query
    await prisma.$queryRaw`SELECT 1 as db_connected`;
    console.log("✅ Database is responsive and ready");

    startSubscriptionExpirationJob();
    await runSubscriptionExpirationCheck();
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    console.error("💡 Check your DATABASE_URL in .env file");
    process.exit(1); // Stop app if DB is not available
  }

  // Start Server after successful DB connection
  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(
      `🚀 HanSim Hair Color Academy API running on http://localhost:${PORT}`,
    );
  });
}

// Run initialization
initializeApp();

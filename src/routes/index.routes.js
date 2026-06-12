import {Router} from "express";

import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import certificateRoutes from "./certificate.routes.js";
import commentRoutes from "./comment.routes.js";
import courseRoutes from "./course.routes.js";
import lessonRoutes from "./lesson.routes.js";
import paymentRoutes from "./payment.routes.js";
import settingRoutes from "./setting.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount all route groups
router.use("/auth", authRoutes);
router.use("/courses", courseRoutes);
router.use("/lessons", lessonRoutes);

router.use("/comments", commentRoutes);
router.use("/users", userRoutes);
router.use("/certificates", certificateRoutes);
router.use("/payment", paymentRoutes);
router.use("/admin", adminRoutes);
router.use("/settings", settingRoutes);

// Payment webhook is handled separately in server.js (because of raw body)

export default router;

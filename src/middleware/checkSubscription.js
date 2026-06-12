import prisma from "../config/db.js";

export const checkSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (req.user.role === "ADMIN") {
      return next();
    } else {
      let userId = req.user.id;

      if (!userId && req.user.uuid) {
        const user = await prisma.user.findUnique({
          where: {uuid: req.user.uuid},
          select: {id: true},
        });

        userId = user?.id;
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          endDate: {gt: new Date()},
        },
        orderBy: {endDate: "desc"},
      });

      if (!subscription) {
        return res.status(401).json({
          success: false,
          message: "No active subscription found or subscription has expired",
        });
      }

      req.subscription = subscription;
      next();
    }
  } catch (error) {
    console.error("Subscription check error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default checkSubscription;

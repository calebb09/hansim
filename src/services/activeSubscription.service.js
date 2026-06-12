import prisma from "../config/db.js";
export const hasActiveSubscription = async (userUuid) => {
  if (!userUuid) return false;

  const user = await prisma.user.findUnique({
    where: {uuid: userUuid},
    select: {id: true},
  });

  if (!user) return false;

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      endDate: {gt: new Date()},
    },
    select: {id: true},
  });

  return Boolean(subscription);
};

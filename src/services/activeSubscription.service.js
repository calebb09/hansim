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

// check subscription package id and check if package category id is equal to course category id
export const hasActiveSubscriptionForCourseCategory = async (
  userUuid,
  categoryId,
) => {
  if (!userUuid || !categoryId) return false;

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
      package: {
        categoryId: categoryId,
      },
    },
    select: {id: true},
  });

  return Boolean(subscription);
};

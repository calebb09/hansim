import cron from "node-cron";
import prisma from "../config/db.js";
import {sendEmail} from "../services/mail.service.js";

const DEFAULT_CRON_SCHEDULE = "0 9 * * *";
const DEFAULT_TIMEZONE = "Africa/Addis_Ababa";

const getOneMonthFromNow = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

const expireSubscriptions = async (now) => {
  const result = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      endDate: {lte: now},
    },
    data: {
      status: "EXPIRED",
    },
  });

  return result.count;
};

const getSubscriptionsNeedingReminder = async (now, reminderDeadline) => {
  return prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: {
        gt: now,
        lte: reminderDeadline,
      },
      expiryReminderSentAt: null,
    },
    include: {
      user: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
  });
};

const notifyExpiringSubscription = async (subscription) => {
  const result = await sendEmail({
    to: subscription.user.email,
    subject: "Your HanSim Hair subscription expires soon",
    message: `
      <p>Hello ${subscription.user.fullName},</p>
      <p>Your HanSim Hair subscription will expire on ${formatDate(
        subscription.endDate,
      )}.</p>
      <p>Please renew your subscription before this date to keep your access active.</p>
    `,
  });

  if (!result.success) {
    console.warn(
      `Failed to send expiration reminder to ${subscription.user.email}: ${result.error}`,
    );
    return false;
  }

  await prisma.subscription.update({
    where: {id: subscription.id},
    data: {expiryReminderSentAt: new Date()},
  });

  return true;
};

export const runSubscriptionExpirationCheck = async () => {
  const now = new Date();
  const reminderDeadline = getOneMonthFromNow();

  const expiredCount = await expireSubscriptions(now);
  const subscriptionsToNotify = await getSubscriptionsNeedingReminder(
    now,
    reminderDeadline,
  );

  let notifiedCount = 0;

  for (const subscription of subscriptionsToNotify) {
    const notified = await notifyExpiringSubscription(subscription);
    if (notified) notifiedCount += 1;
  }

  console.log(
    `Subscription expiration check complete: ${expiredCount} expired, ${notifiedCount} reminders sent`,
  );

  return {
    expiredCount,
    notifiedCount,
  };
};

export const startSubscriptionExpirationJob = () => {
  const schedule =
    process.env.SUBSCRIPTION_EXPIRATION_CRON || DEFAULT_CRON_SCHEDULE;
  const timezone =
    process.env.SUBSCRIPTION_EXPIRATION_TIMEZONE || DEFAULT_TIMEZONE;

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid SUBSCRIPTION_EXPIRATION_CRON: ${schedule}`);
  }

  const task = cron.schedule(
    schedule,
    () => {
      runSubscriptionExpirationCheck().catch((error) => {
        console.error("Subscription expiration job failed:", error);
      });
    },
    {timezone},
  );

  console.log(
    `Subscription expiration job scheduled with "${schedule}" (${timezone})`,
  );

  return task;
};

import prisma from "../config/db.js";
const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;

export const activateStripeSubscription = async (paymentIntent) => {
  console.log(paymentIntent.metadata);
  const transactionRef = paymentIntent.metadata?.transactionId;

  if (!transactionRef) {
    console.warn("Stripe payment intent is missing transactionId metadata");
    return;
  }

  const transaction = await prisma.transaction.findFirst({
    where: {txn_id: transactionRef},
  });

  console.log(`the transaction data =>>`, transaction);

  if (!transaction) {
    console.warn(`No transaction found for Stripe ref: ${transactionRef}`);
    return;
  }

  console.log(`Activating subscription for transaction: ${transaction.id}`);

  await prisma.transaction.update({
    where: {id: transaction.id},
    data: {status: "SUCCEEDED"},
  });

  const existingSubscription = await prisma.subscription.findUnique({
    where: {transactionId: transaction.id},
  });

  if (existingSubscription) {
    return;
  }

  await prisma.subscription.create({
    data: {
      userId: transaction.userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + ONE_YEAR_IN_MS),
      paymentProvider: "stripe",
      transactionId: transaction.id,
      amount: paymentIntent.amount_received
        ? paymentIntent.amount_received / 100
        : transaction.amount,
      currency: paymentIntent.currency?.toUpperCase() || transaction.currency,
      status: "ACTIVE",
    },
  });
};

export const failStripeTransaction = async (paymentIntent) => {
  const transactionRef = paymentIntent.metadata?.transactionId;

  if (!transactionRef) {
    return;
  }

  const transaction = await prisma.transaction.findFirst({
    where: {txn_id: transactionRef},
  });

  if (transaction) {
    await prisma.transaction.update({
      where: {id: transaction.id},
      data: {status: "FAILED"},
    });
  }
};

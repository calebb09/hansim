import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-04-22.dahlia";

let stripeClient;

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing in environment variables");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  return stripeClient;
};

const serviceError = (error) => ({
  status: error.statusCode || 500,
  error: error.message,
  code: error.code,
  type: error.type,
});

export const createPaymentIntent = async ({
  amount,
  currency = "usd",
  transactionId,
  userId,
  confirm = false,
  captureMethod = "automatic",
} = {}) => {
  try {
    if (!amount || Number(amount) <= 0) {
      throw new Error("amount is required and must be greater than 0");
    }

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Number(amount),
      currency: currency.toLowerCase(),
      metadata: {
        transactionId: transactionId || `txn_${Date.now()}`,
        userId: userId || "unknown_user",
      },
      confirm,
      capture_method: captureMethod,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {status: 200, data: paymentIntent};
  } catch (error) {
    return serviceError(error);
  }
};

export const confirmPaymentIntent = async (
  paymentIntentId,
  paymentMethodId,
) => {
  try {
    if (!paymentIntentId) throw new Error("paymentIntentId is required");

    const paymentIntent = await getStripe().paymentIntents.confirm(
      paymentIntentId,
      {
        ...(paymentMethodId && {payment_method: paymentMethodId}),
      },
    );

    return {status: 200, data: paymentIntent};
  } catch (error) {
    return serviceError(error);
  }
};

export const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    if (!paymentIntentId) throw new Error("paymentIntentId is required");

    const paymentIntent =
      await getStripe().paymentIntents.retrieve(paymentIntentId);

    return {status: 200, data: paymentIntent};
  } catch (error) {
    return serviceError(error);
  }
};

export const createCheckoutSession = async ({
  customerId,
  customerEmail,
  lineItems,
  successUrl,
  cancelUrl,
  metadata = {},
  mode = "payment",
} = {}) => {
  try {
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new Error("lineItems must contain at least one item");
    }
    if (!successUrl) throw new Error("successUrl is required");
    if (!cancelUrl) throw new Error("cancelUrl is required");

    const session = await getStripe().checkout.sessions.create({
      mode,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_method_types: ["card"],
      ...(customerId && {customer: customerId}),
      ...(!customerId && customerEmail && {customer_email: customerEmail}),
    });

    return {status: 200, data: session};
  } catch (error) {
    return serviceError(error);
  }
};

export const constructWebhookEvent = (rawBody, signature) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is missing in environment variables",
    );
  }

  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
};

export default {
  createPaymentIntent,
  confirmPaymentIntent,
  retrievePaymentIntent,
  createCheckoutSession,
  constructWebhookEvent,
};

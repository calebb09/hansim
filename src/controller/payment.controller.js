import prisma from "../config/db.js";
import {createPayment, currencyConvert} from "../services/chapa.service.js";
import {
  constructWebhookEvent,
  createPaymentIntent,
  retrievePaymentIntent,
} from "../services/stripe.service.js";
import {
  activateStripeSubscription,
  failStripeTransaction,
} from "../services/update_subscription.service.js";

export const mySubscription = async (req, res) => {
  try {
    const userID = await prisma.user.findUnique({
      where: {uuid: req.user.uuid},
      select: {id: true},
    });
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: userID.id,
      },
      include: {
        transaction: true,
      },
    });

    if (!subscription) {
      return res
        .status(404)
        .json({success: false, message: "No active subscription found"});
    }

    res.json({success: true, data: subscription});
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({success: false, message: error.message});
  }
};

export const myTransactions = async (req, res) => {
  try {
    const userID = await prisma.user.findUnique({
      where: {uuid: req.user.uuid},
      select: {id: true},
    });

    if (!userID) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.transaction.count({
      where: {
        userId: userID.id,
      },
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userID.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        subscription: true,
        setting: {
          // ← Fixed: should be "setting" not "packge_id"
          select: {
            amount: true,
            duration: true,
            categoryId: true,
          },
        },
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const subscribe = async (req, res) => {
  try {
    const {currency, packageId} = req.params;

    //get user
    const user = await prisma.user.findUnique({
      where: {uuid: req.user.uuid},
    });

    if (!user) {
      return res.status(404).json({success: false, message: "User not found"});
    }

    const etbRate = await currencyConvert();
    console.log("ETB Rate:", etbRate); // Debug log for exchange rate

    //show setting
    const setting = await prisma.setting.findUnique({
      where: {id: packageId},
    });
    if (!setting) {
      return res
        .status(500)
        .json({success: false, message: "Subscription settings not found"});
    }

    const amount =
      currency === "USD"
        ? setting.amount
        : setting.amount * etbRate.data[0].rate;

    const userID = await prisma.user.findUnique({
      where: {uuid: req.user.uuid},
      select: {id: true},
    });

    if (!userID) {
      return res.status(404).json({success: false, message: "User not found"});
    }

    // add transacntion record in db
    const create_transaction = await prisma.transaction.create({
      data: {
        userId: userID.id,
        amount,
        currency: currency.toUpperCase(),
        txn_id: `txn_${Date.now()}`,
        reason: "Subscription Payment",
        packge_id: packageId,
      },
    });

    let showData = {};

    if (currency === "USD") {
      const paymentIntent = await createPaymentIntent({
        amount: Number(amount) * 100, // Convert to cents
        currency: currency.toLowerCase(),
        transactionId: create_transaction.txn_id,
        userId: req.user.uuid || "unknown_user",
      });
      showData = paymentIntent;
    } else {
      if (etbRate.status === 200) {
        // get the first string of the user fullName
        const parts = user.fullName.trim().split(/\s+/);

        const firstName = parts[0] || "";
        const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
        const intiializePayment = await createPayment(
          amount,
          currency,
          user.email,
          firstName,
          lastName,
          user.phoneNumber,
          create_transaction.txn_id,
          "Hansim",
          "Payment for annual subscription",
          "https://yourdomain.com/logo.png",
        );
        showData = intiializePayment;
      } else {
        return res.status(etbRate.status).json({message: etbRate.error});
      }
    }

    // await prisma.subscription.create({
    //   data: {
    //     userId: userID.id,
    //     startDate: new Date(),
    //     endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    //     paymentProvider: currency === "USD" ? "stripe" : "chapa",
    //     transactionId: create_transaction.id,
    //     amount,
    //     currency: currency.toUpperCase(),
    //   },
    // });

    return res.status(200).json({success: true, data: showData});
  } catch (error) {
    console.error("Subscription error:", error);
    res.status(500).json({success: false, message: error.message});
  }
};

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case "charge.succeeded": // replace it with payment_intent
        await activateStripeSubscription(event.data.object);
        console.log("✅ Stripe subscription activated");
        break;

      case "charge.canceled":
      case "charge.failed":
      case "payment_intent.payment_failed":
      case "payment_intent.payment_intent_canceled":
        await failStripeTransaction(event.data.object);
        console.log("⚠️ Stripe payment failed");
        break;

      case "charge.failed": {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (paymentIntentId) {
          const paymentIntent = await retrievePaymentIntent(paymentIntentId);

          if (paymentIntent.status === 200) {
            await failStripeTransaction(paymentIntent.data);
          } else {
            console.warn(
              `Could not retrieve PaymentIntent for failed charge: ${paymentIntent.error}`,
            );
          }
        } else {
          await failStripeTransaction(charge);
        }

        console.log("⚠️ Stripe charge failed");
        break;
      }

      case "charge.updated":
        break;

      case "checkout.session.completed":
        const session = event.data.object;

        if (session.metadata?.userId && session.metadata?.courseId) {
          await prisma.subscription.create({
            data: {
              userId: session.metadata.userId,
              startDate: new Date(),
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
              paymentProvider: "stripe",
              transactionId: session.id,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency?.toUpperCase() || "USD",
              status: "ACTIVE",
            },
          });
          console.log(
            `✅ Subscription created for user: ${session.metadata.userId}`,
          );
        }
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
  }

  res.json({received: true});
};

export const chapaWebhook = async (req, res) => {
  try {
    const eventData = req.body;
    const eventType = eventData.event;
    const txRef = eventData.tx_ref;
    const status = eventData.status;
    console.log(
      `✅ Chapa webhook received: ${eventType} with status ${status}`,
    );
    // console.log(eventData);

    const userInfo = await prisma.user.findUnique({
      where: {email: eventData.email},
    });
    console.log(
      `✅ User info retrieved for email: ${eventData.email}`,
      userInfo.id,
    );
    // perform update transaction status in db
    const updateTransaction = await prisma.transaction.updateMany({
      where: {txn_id: txRef},
      data: {status: status === "success" ? "SUCCEEDED" : "FAILED"},
    });
    if (updateTransaction) {
      console.log(`✅ Transaction status updated for tx_ref: ${txRef}`);
    }
    console.log(
      `✅ Transaction updated for tx_ref: ${txRef} with status: ${
        status === "success" ? "SUCCEEDED" : "FAILED"
      }`,
    );

    if (status === "success") {
      await prisma.subscription.create({
        data: {
          userId: userInfo.id, // Assuming tx_ref is the user ID or you can map it accordingly
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          paymentProvider: "chapa",
          transactionId: updateTransaction.id,
          amount: parseFloat(eventData.amount),
          currency: eventData.currency.toUpperCase(),
          status: "ACTIVE",
        },
      });
      console.log(`✅ Subscription created for user: ${tx_ref}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error("Error processing Chapa webhook:", error);
    res.status(500).json({message: "Internal Server Error"});
  }
};

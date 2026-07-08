import {Router} from "express";
import {
  chapaWebhook,
  mySubscription,
  myTransactions,
  subscribe,
} from "../controller/payment.controller.js";
import {verifySignature} from "../middleware/chapaSignature.js";
import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";

const router = Router();
router.get(
  "/mySubscription",
  FirebaseAuthenticated(["STUDENT"]),
  mySubscription,
);
router.get("/transaction_history", FirebaseAuthenticated(["STUDENT"]), myTransactions);
router.get(
  "/subscribe/:currency/package/:packageId",
  FirebaseAuthenticated(["STUDENT"]),
  subscribe,
);
router.post("/chapa-webhook", verifySignature, chapaWebhook);

export default router;

import {Router} from "express";
import {
  chapaWebhook,
  mySubscription,
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
router.get(
  "/subscribe/:currency/package/:packageId",
  FirebaseAuthenticated(["STUDENT"]),
  subscribe,
);
router.post("/chapa-webhook", verifySignature, chapaWebhook);

export default router;

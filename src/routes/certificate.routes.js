import {Router} from "express";
import {
  generateCertificate,
  getMyCertificates,
} from "../controller/certificate.controller.js";
import {checkSubscription} from "../middleware/checkSubscription.js";
import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";

const router = Router();

router.post(
  "/generate",
  FirebaseAuthenticated(["STUDENT"]),
  checkSubscription,
  generateCertificate,
);
router.get(
  "/my",
  FirebaseAuthenticated(["STUDENT"]),
  checkSubscription,
  getMyCertificates,
);

export default router;

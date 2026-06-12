import {Router} from "express";
import {
  getAllStudents,
  updateSubscription,
} from "../controller/admin.controller.js";
import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";

const router = Router();

router.get("/students", FirebaseAuthenticated(["ADMIN"]), getAllStudents);
router.patch("/subscriptions/:id", updateSubscription);

export default router;

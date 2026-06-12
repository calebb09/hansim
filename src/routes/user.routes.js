import {Router} from "express";
import {getStudentDashboard, profile} from "../controller/user.controller.js";

import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";

const router = Router();

router.get(
  "/dashboard",
  FirebaseAuthenticated(["STUDENT"]),
  getStudentDashboard,
);
router.get("/profile", FirebaseAuthenticated(["ADMIN", "STUDENT"]), profile);

export default router;

import {Router} from "express";
import {
  login,
  refreshToken,
  register,
  revoke,
} from "../controller/auth.controller.js";
import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";
import {loginLimiter} from "../middleware/rateLimit.middleware.js";
const router = Router();

router.get("/revoke/:uid", FirebaseAuthenticated(["ADMIN"]), revoke);
router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/refresh", loginLimiter, refreshToken);

export default router;

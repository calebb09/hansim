import {Router} from "express";
import {
  createSettings,
  getSettings,
  removeSetting,
  updateSettings,
} from "../controller/setting.controller.js";
import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";

const router = Router();

router.post("/", FirebaseAuthenticated(["ADMIN"]), createSettings);
router.get("/", getSettings);
router.put("/:id", FirebaseAuthenticated(["ADMIN"]), updateSettings);
router.delete("/:id", FirebaseAuthenticated(["ADMIN"]), removeSetting);

export default router;

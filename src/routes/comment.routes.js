import {Router} from "express";
import {
  createComment,
  deleteComment,
  getLessonComments,
} from "../controller/comment.controller.js";
import {checkSubscription} from "../middleware/checkSubscription.js";
import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";

const router = Router();

router.post(
  "/",
  FirebaseAuthenticated(["STUDENT", "ADMIN"]),
  checkSubscription,
  createComment,
);
router.get(
  "/lesson/:lessonId",
  FirebaseAuthenticated(["STUDENT", "ADMIN"]),
  checkSubscription,
  getLessonComments,
);
router.delete(
  "/:id",
  FirebaseAuthenticated(["STUDENT", "ADMIN"]),
  checkSubscription,
  deleteComment,
);

export default router;

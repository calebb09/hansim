import {Router} from "express";
import {
  deleteLesson,
  getLessonById,
  getLessonsByCourse,
  markLessonComplete,
  updateLesson,
} from "../controller/lesson.controller.js";
import {checkSubscription} from "../middleware/checkSubscription.js";
import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";
import {uploadLessonFiles} from "../middleware/upload.middleware.js";

const router = Router();

router.get(
  "/course/:courseId",
  FirebaseAuthenticated(["STUDENT", "ADMIN"]),
  checkSubscription,
  getLessonsByCourse,
);
router.get(
  "/:id",
  FirebaseAuthenticated(["STUDENT", "ADMIN"]),
  checkSubscription,
  getLessonById,
);
router.get(
  "/complete/:id",
  FirebaseAuthenticated(["STUDENT"]),
  checkSubscription,
  markLessonComplete,
);

router.put(
  "/:id",
  FirebaseAuthenticated(["ADMIN"]),
  uploadLessonFiles,
  updateLesson,
);
router.delete("/:id", FirebaseAuthenticated(["ADMIN"]), deleteLesson);

export default router;

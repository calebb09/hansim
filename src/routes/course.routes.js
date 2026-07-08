import {Router} from "express";
import {
  createCourse,
  createLesson,
  createQuizz,
  getAllCourses,
  getCourseById,
  myCourseLists,
  removeCourse,
  viewQuizz,
} from "../controller/course.controller.js";
import {checkSubscription} from "../middleware/checkSubscription.js";
import {
  FirebaseAuthenticated,
  OptionalFirebaseAuthenticated,
} from "../middleware/firebase.middleware.js";
import {uploadLessonFiles} from "../middleware/upload.middleware.js";

const router = Router();

router.get("/", OptionalFirebaseAuthenticated(), getAllCourses);
router.get(
  "/me",
  FirebaseAuthenticated(["STUDENT"]),
  checkSubscription,
  myCourseLists,
);
router.get(
  "/:id/viewQuizz",
  OptionalFirebaseAuthenticated(),
  checkSubscription,
  viewQuizz,
);
router.get("/:id", getCourseById);
router.post("/", FirebaseAuthenticated(["ADMIN"]), createCourse);
router.post(
  "/:id/create_lesson",
  FirebaseAuthenticated(["ADMIN"]),
  uploadLessonFiles,
  createLesson,
);
router.post("/:id/create_quizz", FirebaseAuthenticated(["ADMIN"]), createQuizz);
router.delete("/:id", FirebaseAuthenticated(["ADMIN"]), removeCourse);

export default router;

import {Router} from "express";
import {
  createCourse,
  createLesson,
  getAllCourses,
  getCourseById,
  removeCourse,
} from "../controller/course.controller.js";
import {
  FirebaseAuthenticated,
  OptionalFirebaseAuthenticated,
} from "../middleware/firebase.middleware.js";
import {uploadLessonFiles} from "../middleware/upload.middleware.js";

const router = Router();

router.get("/", OptionalFirebaseAuthenticated(), getAllCourses);
router.get("/:id", getCourseById);
router.post("/", FirebaseAuthenticated(["ADMIN"]), createCourse);
router.post(
  "/:id/create_lesson",
  FirebaseAuthenticated(["ADMIN"]),
  uploadLessonFiles,
  createLesson,
);
router.delete("/:id", FirebaseAuthenticated(["ADMIN"]), removeCourse);

export default router;

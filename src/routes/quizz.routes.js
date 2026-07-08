import {Router} from "express";
import {
  getAllQuizz,
  getQuizById,
  submitQuiz,
  viewSubmission,
} from "../controller/quizz.controller.js";
import {checkSubscription} from "../middleware/checkSubscription.js";
import {
  FirebaseAuthenticated,
  OptionalFirebaseAuthenticated,
} from "../middleware/firebase.middleware.js";
import {preventPassedQuizSubmission} from "../services/checkSubmission.service.js";
const router = Router();

router.get("/", FirebaseAuthenticated(["ADMIN"]), getAllQuizz);
router.get(
  "/:id",
  OptionalFirebaseAuthenticated(),
  checkSubscription,
  getQuizById,
);
router.get(
  "/:quizzId/viewSubmission",
  FirebaseAuthenticated(["STUDENT"]),
  viewSubmission,
);
router.post(
  "/:quizId/submit",
  FirebaseAuthenticated(["STUDENT"]),
  checkSubscription,
  preventPassedQuizSubmission,
  submitQuiz,
);

export default router;

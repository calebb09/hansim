import prisma from "../config/db.js";

export const preventPassedQuizSubmission = async (req, res, next) => {
  try {
    const {quizId} = req.params;
    const UID = req.user.uuid;

    // Get userId from uuid
    const user = await prisma.user.findUnique({
      where: {uuid: UID},
      select: {id: true},
    });

    if (!user) {
      return res.status(404).json({success: false, message: "User not found"});
    }

    const userId = user.id;

    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: "Quiz ID is required",
      });
    }

    // Fetch quiz details (passingScore + maxAttempts)
    const quiz = await prisma.quiz.findUnique({
      where: {id: quizId},
      select: {
        passingScore: true,
        maxAttempts: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Get all submissions by this user for this quiz
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        userId,
        quizId,
      },
      orderBy: {attemptNumber: "desc"},
    });

    const totalAttempts = submissions.length;

    // Case 1: User has already passed → Block completely
    const hasPassed = submissions.some((sub) => sub.isPassed === true);

    if (hasPassed) {
      const passedSubmission = submissions.find((sub) => sub.isPassed === true);
      return res.status(403).json({
        success: false,
        message:
          "You have already passed this quiz. Further submissions are not allowed.",
        data: {
          previousScore: passedSubmission.score,
          submittedAt: passedSubmission.submittedAt,
          attemptNumber: passedSubmission.attemptNumber,
        },
      });
    }

    // Case 2: Check max attempts (only if they haven't passed yet)
    if (quiz.maxAttempts && totalAttempts >= quiz.maxAttempts) {
      return res.status(403).json({
        success: false,
        message: `You have reached the maximum number of attempts (${quiz.maxAttempts}).`,
        data: {
          totalAttempts,
          maxAttempts: quiz.maxAttempts,
        },
      });
    }

    // If we reach here → User can submit (hasn't passed + hasn't reached max attempts)
    next();
  } catch (error) {
    console.error("Quiz Submission Middleware Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

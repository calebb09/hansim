import prisma from "../config/db.js";
import asyncHandler from "../middleware/asyncHandler.js"; // optional but recommended

// Get single quiz with questions
export const getQuizById = asyncHandler(async (req, res) => {
  const {id} = req.params;

  const quiz = await prisma.quiz.findUnique({
    where: {id},
    include: {
      questions: {
        orderBy: {questionOrder: "asc"},
      },
    },
  });

  if (!quiz)
    return res.status(404).json({success: false, message: "Quiz not found"});

  res.json({success: true, data: quiz});
});

export const getAllQuizz = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Optional filters
  const {courseId, isActive} = req.query;

  const whereClause = {
    ...(courseId && {courseId}),
    ...(isActive !== undefined && {isActive: isActive === "true"}),
  };

  // Get total count for pagination metadata
  const total = await prisma.quiz.count({
    where: whereClause,
  });

  const quizzes = await prisma.quiz.findMany({
    where: whereClause,
    include: {
      questions: {
        orderBy: {questionOrder: "asc"},
      },
    },
    orderBy: {createdAt: "desc"},
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: quizzes,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

// Get user's quiz submissions / history
export const viewSubmission = asyncHandler(async (req, res) => {
  const uid = req.user.uuid;

  const userId = await prisma.user.findUnique({
    where: {uuid: uid},
    select: {id: true},
  });

  if (!userId) {
    return res.status(404).json({success: false, message: "User not found"});
  }

  const submissions = await prisma.quizSubmission.findMany({
    where: {userId: userId.id, quizId: req.params.quizzId},
    include: {
      quiz: {
        select: {
          id: true,
          titleEn: true,
          titleAm: true,
          passingScore: true,
          courseId: true,
        },
      },
    },
    orderBy: {submittedAt: "desc"},
  });

  res.json({
    success: true,
    data: submissions,
  });
});

// ======================
// QUIZ SUBMISSION (Multiple Attempts)
// ======================

export const submitQuiz = asyncHandler(async (req, res) => {
  const {quizId} = req.params;
  const {answers, timeTaken} = req.body; // answers = { questionId: userAnswer, ... }
  const UID = req.user.uuid; // from auth middleware

  //get userId from uuid
  const user = await prisma.user.findUnique({
    where: {uuid: UID},
    select: {id: true},
  });

  if (!user) {
    return res.status(404).json({success: false, message: "User not found"});
  }

  const userId = user.id;

  // Get quiz details
  const quiz = await prisma.quiz.findUnique({
    where: {id: quizId},
    include: {questions: true},
  });

  if (!quiz)
    return res.status(404).json({success: false, message: "Quiz not found"});

  // Count previous attempts
  const previousAttempts = await prisma.quizSubmission.count({
    where: {userId, quizId},
  });

  if (quiz.maxAttempts && previousAttempts >= quiz.maxAttempts) {
    return res.status(400).json({
      success: false,
      message: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz.`,
    });
  }

  const attemptNumber = previousAttempts + 1;

  // Calculate score
  let totalPoints = 0;
  let earnedPoints = 0;

  quiz.questions.forEach((question) => {
    totalPoints += question.points;
    const userAnswer = answers[question.id];
    const correctAnswer = question.correctAnswer;

    if (
      userAnswer !== undefined &&
      JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)
    ) {
      earnedPoints += question.points;
    }
  });

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const isPassed = quiz.passingScore ? score >= quiz.passingScore : true;

  // Create submission
  const submission = await prisma.quizSubmission.create({
    data: {
      userId,
      quizId,
      attemptNumber,
      score,
      answers,
      isPassed,
      timeTaken,
    },
    include: {
      quiz: {select: {titleEn: true, titleAm: true}},
    },
  });

  res.status(201).json({
    success: true,
    message: `Quiz submitted successfully (Attempt ${attemptNumber})`,
    data: submission,
  });
});

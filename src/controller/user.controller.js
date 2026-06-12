import prisma from "../config/db.js";

export const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.uuid;

    // 1. Get user basic data + subscriptions + completions + certificates
    const user = await prisma.user.findUnique({
      where: {uuid: userId},
      include: {
        subscriptions: {
          where: {status: "ACTIVE"},
          include: {
            transaction: true, // optional but useful
          },
        },
        completions: true,
        certificates: true,
      },
    });

    if (!user) {
      return res.status(404).json({success: false, message: "User not found"});
    }

    // 2. Get courses the user has access to (via completions or certificates)
    const courseIdsFromCompletions = [
      ...new Set(user.completions.map((c) => c.lesson.courseId)),
    ];
    const courseIdsFromCertificates = user.certificates.map((c) => c.courseId);

    const accessibleCourseIds = [
      ...new Set([...courseIdsFromCompletions, ...courseIdsFromCertificates]),
    ];

    // Fetch full course data with lessons
    const courses = await prisma.course.findMany({
      where: {
        id: {in: accessibleCourseIds},
        isActive: true,
      },
      include: {
        lessons: true,
      },
    });

    // Combine everything
    const dashboardData = {
      ...user,
      courses, // ← Add courses here
      // subscriptions remain as they are
    };

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({success: false, message: error.message});
  }
};

export const profile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {uuid: req.user.uuid},
    });

    if (!user) {
      return res.status(404).json({success: false, message: "User not found"});
    }

    return res.json({success: true, user});
  } catch (error) {
    return res.status(500).json({success: false, message: error.message});
  }
};

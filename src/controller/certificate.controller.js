import prisma from "../config/db.js";

export const generateCertificate = async (req, res) => {
  try {
    const userId = req.user.id;
    const {courseId} = req.body;

    // Check if all lessons are completed
    const course = await prisma.course.findUnique({
      where: {id: courseId},
      include: {lessons: true},
    });

    const completedLessons = await prisma.lessonCompletion.count({
      where: {userId, lessonId: {in: course.lessons.map((l) => l.id)}},
    });

    if (completedLessons !== course.lessons.length) {
      return res.status(400).json({message: "Not all lessons completed"});
    }

    const certificate = await prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateId: `HAN-${Date.now().toString().slice(-8)}`,
        issuedAt: new Date(),
      },
    });

    res.json({success: true, data: certificate});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    const certificates = await prisma.certificate.findMany({
      where: {userId},
      include: {course: true},
    });
    res.json({success: true, data: certificates});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

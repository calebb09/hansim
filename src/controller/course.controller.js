import prisma from "../config/db.js";
import {hasActiveSubscription} from "../services/activeSubscription.service.js";
import {deleteUploadedFiles} from "../utils/file_path.utils.js";

const ADMIN_ROLES = ["ADMIN", "INSTRUCTOR", "super_admin"];

export const getAllCourses = async (req, res) => {
  try {
    const {page = 1, limit = 10, search = ""} = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where condition
    const where = {
      isActive: true,
      ...(search && {
        OR: [
          {title: {contains: search, mode: "insensitive"}},
          {description: {contains: search, mode: "insensitive"}},
        ],
      }),
    };

    // Get total count for pagination metadata
    const totalCourses = await prisma.course.count({where});
    const userRole = req.user?.role;
    const canViewAllLessons =
      ADMIN_ROLES.includes(userRole) ||
      (userRole === "STUDENT" && (await hasActiveSubscription(req.user?.uuid)));

    // Fetch courses with pagination
    const courses = await prisma.course.findMany({
      where,
      include: {
        lessons: {
          orderBy: {lessonOrder: "asc"},
          ...(canViewAllLessons ? {} : {take: 1}),
        },
        // You can add more relations if needed
        // instructor: true,
      },
      orderBy: {
        createdAt: "desc", // Most recent first
      },
      skip: skip,
      take: limitNumber,
    });

    const totalPages = Math.ceil(totalCourses / limitNumber);

    res.status(200).json({
      success: true,
      message: "Courses fetched successfully",
      data: {
        courses,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: totalCourses,
          itemsPerPage: limitNumber,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const {id} = req.params;
    const course = await prisma.course.findUnique({
      where: {id},
      include: {
        lessons: {orderBy: {lessonOrder: "asc"}},
        instructor: true,
      },
    });
    if (!course) return res.status(404).json({message: "Course not found"});
    res.json({success: true, data: course});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const createCourse = async (req, res) => {
  try {
    const {title, description, what_you_learn, requirement, categoryId} =
      req.body;
    if (
      !title ||
      !description ||
      !what_you_learn ||
      !requirement ||
      !categoryId
    ) {
      return res
        .status(400)
        .json({success: false, message: "All fields are required"});
    }
    const course = await prisma.course.create({
      data: {title, description, what_you_learn, requirement, categoryId},
    });
    res.status(201).json({success: true, data: course});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const createLesson = async (req, res) => {
  try {
    const {id: courseId} = req.params;

    console.log(req.body);

    const {
      titleEn,
      titleAm,
      descriptionEn,
      descriptionAm,
      lessonOrder,
      videoUrlEn,
      videoUrlAm,
    } = req.body;

    // Check if course exists
    const course = await prisma.course.findUnique({where: {id: courseId}});
    if (!course) {
      return res
        .status(404)
        .json({success: false, message: "Course not found"});
    }

    // Get uploaded PDF paths (they are optional)
    const pdfUrlEn = req.files?.pdfEn?.[0]
      ? `/uploads/pdfs/${req.files.pdfEn[0].filename}`
      : null;

    const pdfUrlAm = req.files?.pdfAm?.[0]
      ? `/uploads/pdfs/${req.files.pdfAm[0].filename}`
      : null;

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        lessonOrder: parseInt(lessonOrder),
        titleEn,
        titleAm: titleAm || null,
        descriptionEn: descriptionEn || null,
        descriptionAm: descriptionAm || null,
        videoUrlEn: videoUrlEn || null,
        videoUrlAm: videoUrlAm || null,
        pdfUrlEn,
        pdfUrlAm,
      },
    });

    res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      data: lesson,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create lesson",
      error: error.message,
    });
  }
};

export const removeCourse = async (req, res) => {
  try {
    const {id} = req.params;

    const course = await prisma.course.findUnique({
      where: {id},
      include: {
        lessons: {
          select: {
            pdfUrlEn: true,
            pdfUrlAm: true,
          },
        },
        certificates: {
          select: {
            pdfUrl: true,
          },
        },
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({success: false, message: "Course not found"});
    }

    const fileUrls = [
      ...course.lessons.flatMap((lesson) => [lesson.pdfUrlEn, lesson.pdfUrlAm]),
      ...course.certificates.map((certificate) => certificate.pdfUrl),
    ].filter(Boolean);

    await prisma.$transaction([
      prisma.certificate.deleteMany({where: {courseId: id}}),
      prisma.course.delete({where: {id}}),
    ]);

    await deleteUploadedFiles(fileUrls);

    res.json({
      success: true,
      message: "Course, lessons, and related files deleted successfully",
    });
  } catch (error) {
    console.error("Failed to remove course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove course",
      error: error.message,
    });
  }
};

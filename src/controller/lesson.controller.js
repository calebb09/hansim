import prisma from "../config/db.js";
import {deleteUploadedFiles} from "../utils/file_path.utils.js";

const getUploadedLessonFileUrls = (files) => ({
  pdfUrlEn: files?.pdfEn?.[0]
    ? `/uploads/pdfs/${files.pdfEn[0].filename}`
    : undefined,
  pdfUrlAm: files?.pdfAm?.[0]
    ? `/uploads/pdfs/${files.pdfAm[0].filename}`
    : undefined,
});

export const getLessonsByCourse = async (req, res) => {
  try {
    const {courseId} = req.params;
    const lessons = await prisma.lesson.findMany({
      where: {courseId},
      orderBy: {lessonOrder: "asc"},
    });
    res.json({success: true, data: lessons});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const getLessonById = async (req, res) => {
  try {
    const {id} = req.params;
    const lesson = await prisma.lesson.findUnique({where: {id}});
    if (!lesson) return res.status(404).json({message: "Lesson not found"});
    res.json({success: true, data: lesson});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const markLessonComplete = async (req, res) => {
  try {
    const {id} = req.params;

    const user = await prisma.user.findUnique({
      where: {uuid: req.user.uuid},
      select: {id: true},
    });

    if (!user) {
      return res.status(404).json({success: false, message: "User not found"});
    }

    const lesson = await prisma.lesson.findUnique({
      where: {id},
      select: {id: true},
    });

    if (!lesson) {
      return res.status(404).json({success: false, message: "Lesson not found"});
    }

    const existingCompletion = await prisma.lessonCompletion.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: id,
        },
      },
    });

    if (existingCompletion) {
      return res.json({
        success: true,
        message: "Lesson already completed",
        data: existingCompletion,
      });
    }

    const completion = await prisma.lessonCompletion.create({
      data: {
        userId: user.id,
        lessonId: id,
        progressPercentage: 100,
      },
    });

    res.status(201).json({
      success: true,
      message: "Lesson marked as completed",
      data: completion,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.json({
        success: true,
        message: "Lesson already completed",
      });
    }

    res.status(500).json({success: false, message: error.message});
  }
};

export const updateLesson = async (req, res) => {
  const uploadedFiles = getUploadedLessonFileUrls(req.files);

  try {
    const {id} = req.params;
    const existingLesson = await prisma.lesson.findUnique({where: {id}});

    if (!existingLesson) {
      await deleteUploadedFiles(Object.values(uploadedFiles).filter(Boolean));
      return res
        .status(404)
        .json({success: false, message: "Lesson not found"});
    }

    const {
      titleEn,
      titleAm,
      descriptionEn,
      descriptionAm,
      lessonOrder,
      videoUrlEn,
      videoUrlAm,
      videoDuration,
    } = req.body;

    const {pdfUrlEn, pdfUrlAm} = uploadedFiles;

    const data = {
      ...(titleEn !== undefined && {titleEn}),
      ...(titleAm !== undefined && {titleAm: titleAm || null}),
      ...(descriptionEn !== undefined && {
        descriptionEn: descriptionEn || null,
      }),
      ...(descriptionAm !== undefined && {
        descriptionAm: descriptionAm || null,
      }),
      ...(lessonOrder !== undefined && {lessonOrder: parseInt(lessonOrder)}),
      ...(videoUrlEn !== undefined && {videoUrlEn: videoUrlEn || null}),
      ...(videoUrlAm !== undefined && {videoUrlAm: videoUrlAm || null}),
      ...(videoDuration !== undefined && {
        videoDuration: videoDuration || null,
      }),
      ...(pdfUrlEn !== undefined && {pdfUrlEn}),
      ...(pdfUrlAm !== undefined && {pdfUrlAm}),
    };

    if (
      lessonOrder !== undefined &&
      (!Number.isInteger(data.lessonOrder) || data.lessonOrder <= 0)
    ) {
      await deleteUploadedFiles(Object.values(uploadedFiles).filter(Boolean));
      return res.status(400).json({
        success: false,
        message: "lessonOrder must be a positive integer",
      });
    }

    const updatedLesson = await prisma.lesson.update({
      where: {id},
      data,
    });

    const replacedFiles = [
      pdfUrlEn ? existingLesson.pdfUrlEn : null,
      pdfUrlAm ? existingLesson.pdfUrlAm : null,
    ].filter(Boolean);

    await deleteUploadedFiles(replacedFiles);

    res.json({
      success: true,
      message: "Lesson updated successfully",
      data: updatedLesson,
    });
  } catch (error) {
    await deleteUploadedFiles(Object.values(uploadedFiles).filter(Boolean));
    console.error("Failed to update lesson:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lesson",
      error: error.message,
    });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    const {id} = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: {id},
      select: {
        pdfUrlEn: true,
        pdfUrlAm: true,
      },
    });

    if (!lesson) {
      return res
        .status(404)
        .json({success: false, message: "Lesson not found"});
    }

    await prisma.lesson.delete({where: {id}});
    await deleteUploadedFiles(
      [lesson.pdfUrlEn, lesson.pdfUrlAm].filter(Boolean),
    );

    res.json({
      success: true,
      message: "Lesson and related files deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete lesson:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete lesson",
      error: error.message,
    });
  }
};

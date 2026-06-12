import prisma from "../config/db.js";

export const createComment = async (req, res) => {
  try {
    const {lessonId, content} = req.body;
    const uuid = req.user.uuid;

    //userinfo
    const userId = await prisma.user.findUnique({
      where: {uuid},
      select: {id: true},
    });

    const comment = await prisma.comment.create({
      data: {userId: userId.id, lessonId, content},
    });
    res.status(201).json({success: true, data: comment});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const getLessonComments = async (req, res) => {
  try {
    const {lessonId} = req.params;
    const comments = await prisma.comment.findMany({
      where: {lessonId, parentId: null},
      include: {
        user: {select: {fullName: true, id: true}},
        replies: {
          include: {user: {select: {fullName: true, id: true}}},
        },
      },
      orderBy: {createdAt: "asc"},
    });
    res.json({success: true, data: comments});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const deleteComment = async (req, res) => {
  try {
    const {id} = req.params;
    await prisma.comment.delete({where: {id}});
    res.json({success: true, message: "Comment deleted"});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

import prisma from "../config/db.js";

export const getAllStudents = async (req, res) => {
  try {
    const {page = 1, limit = 10, search = ""} = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where condition
    const where = {
      role: "STUDENT",
      ...(search && {
        OR: [
          {fullName: {contains: search, mode: "insensitive"}},
          {email: {contains: search, mode: "insensitive"}},
        ],
      }),
    };

    // Get total count
    const totalStudents = await prisma.user.count({where});

    // Fetch students with pagination
    const students = await prisma.user.findMany({
      where,
      include: {
        subscriptions: true,
        completions: true,
        // You can add more if needed: certificates, etc.
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: skip,
      take: limitNumber,
    });

    const totalPages = Math.ceil(totalStudents / limitNumber);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: totalStudents,
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
      message: "Failed to fetch students",
      error: error.message,
    });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const {id} = req.params;
    const {status, endDate} = req.body;

    const subscription = await prisma.subscription.update({
      where: {id},
      data: {status, endDate: endDate ? new Date(endDate) : undefined},
    });
    res.json({success: true, data: subscription});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

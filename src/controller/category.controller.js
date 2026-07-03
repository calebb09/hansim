import prisma from "../config/db.js";

export const viewLists = async (req, res) => {
  try {
    // make it pagination
    const {page = 1, limit = 10, search = ""} = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const totalCategory = await prisma.course.count();

    const categories = await prisma.category.findMany({
      include: {
        courses: true,
      },
      skip: skip,
      take: limitNumber,
    });

    const totalPages = Math.ceil(totalCategory / limitNumber);

    res.status(200).json({
      success: true,
      message: "Courses fetched successfully",
      data: {
        categories,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: totalCategory,
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
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const {title, description} = req.body;

    // Check if the category already exists
    const existingCategory = await prisma.category.findUnique({
      where: {title},
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    // Create a new category
    const newCategory = await prisma.category.create({
      data: {
        title,
        description,
      },
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const {id} = req.params;
    const {title, description} = req.body;

    // Check if the category exists
    const existingCategory = await prisma.category.findUnique({
      where: {id},
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Update the category
    const updatedCategory = await prisma.category.update({
      where: {id},
      data: {
        title,
        description,
      },
    });

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const {id} = req.params;

    // Check if the category exists
    const existingCategory = await prisma.category.findUnique({
      where: {id},
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Delete the category
    await prisma.category.delete({
      where: {id},
    });

    // remove course with categoryid
    await prisma.course.deleteMany({
      where: {categoryId: id},
    });

    // remove setting with categoryid
    await prisma.setting.deleteMany({
      where: {categoryId: id},
    });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

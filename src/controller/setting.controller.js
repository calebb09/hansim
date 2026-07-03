import prisma from "../config/db.js";

export const createSettings = async (req, res) => {
  try {
    const {amount, duration, categoryId} = req.body;
    if (!amount || !duration || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Amount, duration, and categoryId are required",
      });
    }
    const subscription = await prisma.setting.create({
      data: {
        amount,
        duration,
        categoryId,
      },
    });

    res.status(201).json({success: true, data: subscription});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany({
      include: {
        category: true,
      },
    });

    // show transaction

    const transaction = await prisma.transaction.findFirst({
      where: {
        txn_id: "txn_1783083253091",
      },
    });
    console.log(transaction);
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const {id} = req.params;
    const {duration, amount} = req.body;

    const setting = await prisma.setting.update({
      where: {id},
      data: {duration, amount},
    });
    res.json({
      success: true,
      data: {
        id: setting.id,
        duration: setting.duration,
        amount: setting.amount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update setting",
      error: error.message,
    });
  }
};

export const removeSetting = async (req, res) => {
  try {
    const {id} = req.params;

    const setting = await prisma.setting.delete({
      where: {id},
    });
    res.json({
      success: true,
      data: {
        id: setting.id,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to remove setting",
      error: error.message,
    });
  }
};

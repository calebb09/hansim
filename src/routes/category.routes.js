import {Router} from "express";
import {
  createCategory,
  updateCategory,
  viewLists,
  deleteCategory
} from "../controller/category.controller.js";
import {FirebaseAuthenticated} from "../middleware/firebase.middleware.js";

const router = Router();

router.get("/", viewLists);
router.post("/create", FirebaseAuthenticated(["ADMIN"]), createCategory);
router.put("/:id", FirebaseAuthenticated(["ADMIN"]), updateCategory);
router.delete("/:id", FirebaseAuthenticated(["ADMIN"]), deleteCategory);
export default router;

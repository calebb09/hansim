import multer from "multer";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use absolute path from project root
const uploadDir = path.resolve(__dirname, "../../uploads/pdfs");
const maxPdfSizeMb = parseInt(process.env.MAX_PDF_UPLOAD_MB || "10", 10);
const maxPdfSizeBytes = maxPdfSizeMb * 1024 * 1024;

console.log("Upload directory:", uploadDir); // ← Helpful for debugging
fs.mkdirSync(uploadDir, {recursive: true});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    return cb(null, true);
  }
  cb(new Error("Only PDF files are allowed!"), false);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {fileSize: maxPdfSizeBytes},
});

const lessonFileUpload = upload.fields([
  {name: "pdfEn", maxCount: 1},
  {name: "pdfAm", maxCount: 1},
]);

const multerErrorMessages = {
  LIMIT_FILE_SIZE: `PDF file is too large. Maximum allowed size is ${maxPdfSizeMb}MB.`,
  LIMIT_UNEXPECTED_FILE:
    "Unexpected PDF field. Use pdfEn and/or pdfAm, with only one file per field.",
  LIMIT_FILE_COUNT: "Too many files uploaded.",
  LIMIT_PART_COUNT: "Too many multipart fields/files uploaded.",
  LIMIT_FIELD_COUNT: "Too many form fields uploaded.",
  LIMIT_FIELD_KEY: "A form field name is too long.",
  LIMIT_FIELD_VALUE: "A form field value is too long.",
};

export const uploadLessonFiles = (req, res, next) => {
  lessonFileUpload(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      console.error("Lesson PDF upload failed:", {
        code: error.code,
        field: error.field,
        message: error.message,
      });

      return res.status(400).json({
        success: false,
        message: multerErrorMessages[error.code] || error.message,
        error: error.message,
        code: error.code,
        field: error.field,
        allowedFields: ["pdfEn", "pdfAm"],
        maxPdfSizeMb,
      });
    }

    console.error("Lesson PDF upload failed:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to upload PDF file",
    });
  });
};

export default upload;

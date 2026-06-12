import {unlink} from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads");

const getUploadedFilePath = (fileUrl) => {
  if (!fileUrl) return null;

  let pathname = fileUrl;

  try {
    pathname = new URL(fileUrl).pathname;
  } catch {
    // Local upload paths are stored as /uploads/... and are not valid URLs.
  }

  const normalizedPathname = decodeURIComponent(pathname).replace(/^\/+/, "");

  if (!normalizedPathname.startsWith("uploads/")) {
    return null;
  }

  const filePath = path.resolve(__dirname, "../..", normalizedPathname);
  const isInsideUploads =
    filePath === uploadsRoot ||
    filePath.startsWith(`${uploadsRoot}${path.sep}`);

  return isInsideUploads ? filePath : null;
};

export const deleteUploadedFiles = async (fileUrls) => {
  const filePaths = [
    ...new Set(fileUrls.map(getUploadedFilePath).filter(Boolean)),
  ];

  const results = await Promise.allSettled(
    filePaths.map((filePath) => unlink(filePath)),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected" && result.reason?.code !== "ENOENT") {
      console.warn(
        `Failed to delete uploaded file ${filePaths[index]}: ${result.reason.message}`,
      );
    }
  });
};

import multer from "multer";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "../services/materialService.js";
import path from "path";

const storage = multer.memoryStorage();

export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Invalid file type '${ext}'. Only PDF, DOC, DOCX, PPT, PPTX, and TXT files are allowed.`));
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) && file.mimetype !== "application/octet-stream") {
      return cb(new Error(`Invalid MIME type '${file.mimetype}'.`));
    }
    cb(null, true);
  },
});

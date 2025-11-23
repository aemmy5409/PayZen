// multer/multer.config.js
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { fileTypeFromBuffer } from "file-type";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Step 1: diskStorage — saves file to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Step 2: First filter — only allow .png/.jpg/.jpeg extensions
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext)) {
    // Accept file temporarily so Multer saves it
    cb(null, true);
  } else {
    cb(new Error("Only PNG and JPEG images are allowed"));
  }
};

// Step 3: Create Multer instance (saves file first)
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter,
}).single("file"); // make sure your route uses this exact field name: "file"

// Step 4: Middleware that runs AFTER Multer saved the file
// This validates the real file type and deletes fake files
const validateImageFile = async (req, res, next) => {
  if (!req.file) {
    return next(); // no file uploaded → skip (or handle in controller)
  }

  const filePath = req.file.path;

  try {
    const buffer = await fs.promises.readFile(filePath);
    const type = await fileTypeFromBuffer(buffer);

    if (type && (type.mime === "image/png" || type.mime === "image/jpeg")) {
      // Real image → keep it
      return next();
    } else {
      // Fake or wrong file → delete immediately
      await fs.promises.unlink(filePath);
      return res.status(400).json({
        success: false,
        message: "Invalid file content. Only real PNG/JPEG images allowed.",
      });
    }
  } catch (err) {
    // If reading fails (corrupted, etc.), delete file
    await fs.promises.unlink(filePath).catch(() => {});
    return res.status(400).json({
      success: false,
      message: "Failed to verify uploaded image.",
    });
  }
};

export { upload, validateImageFile };
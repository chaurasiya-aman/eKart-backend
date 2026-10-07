import multer from "multer"

const storage = multer.memoryStorage();
const uploadOptions = {
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype?.startsWith("image/")) {
      return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
    callback(null, true);
  },
};

//For uploading single file
export const singleUpload = multer(uploadOptions).single("file")

// for uploading multiple files
export const multiUpload = multer(uploadOptions).array("files", 5);

// import multer from "multer";

// const storage = multer.memoryStorage();

// export const multiUpload = multer({
//   storage,
// }).any();

// export const singleUpload = multer({
//   storage,
// }).any();

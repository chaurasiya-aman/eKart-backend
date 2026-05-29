import multer from "multer"

const storage = multer.memoryStorage();

//For uploading single file
export const singleUpload = multer({storage}).single("file")

// for uploading multiple files
export const multiUpload = multer({storage}).array("files", 5);

// import multer from "multer";

// const storage = multer.memoryStorage();

// export const multiUpload = multer({
//   storage,
// }).any();

// export const singleUpload = multer({
//   storage,
// }).any();
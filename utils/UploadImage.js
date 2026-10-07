import cloudinary from "./cloudinary.js";

export const uploadToCloudinary = (buffer, folder = "profile_photos") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
};

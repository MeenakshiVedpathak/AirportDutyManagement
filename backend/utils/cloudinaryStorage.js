const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadPdfToCloudinary = (base64Data, filename, dutyId) => {
  const publicId = `duties/${dutyId}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      `data:application/pdf;base64,${base64Data}`,
      {
        resource_type: 'raw',
        public_id: publicId,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
  });
};

const deletePdfFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (_) {}
};

module.exports = { uploadPdfToCloudinary, deletePdfFromCloudinary };

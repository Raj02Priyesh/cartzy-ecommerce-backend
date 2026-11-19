const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const path = require("path");

const isS3Configured = () =>
  Boolean(
    process.env.AWS_REGION &&
      process.env.AWS_S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );

// Create the S3 client lazily so the API can start without AWS configured;
// only image uploads need it.
let s3Client;
const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

const uploadToS3 = async (file, folder = "uploads") => {
  if (!isS3Configured()) {
    throw new Error("Image upload is not configured (AWS S3 environment variables are missing)");
  }
  try {
    const fileExt = path.extname(file.originalname);
    const fileName = `${folder}/${crypto.randomUUID()}${fileExt}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await getS3Client().send(new PutObjectCommand(params));
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new Error("Error uploading file to S3");
  }
};

module.exports = { uploadToS3, isS3Configured };

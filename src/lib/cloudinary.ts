import { v2 as cloudinary } from "cloudinary";

let _configured = false;

function ensureConfigured() {
  if (!_configured) {
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    _configured = true;
  }
}

export async function uploadImage(
  imageUrl: string,
  folder: string = "myt-designs"
): Promise<string> {
  ensureConfigured();

  const result = await cloudinary.uploader.upload(imageUrl, {
    folder,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

  return result.secure_url;
}

export async function uploadFromBuffer(
  buffer: Buffer,
  folder: string = "myt-banners"
): Promise<string> {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "image" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!.secure_url);
        }
      )
      .end(buffer);
  });
}

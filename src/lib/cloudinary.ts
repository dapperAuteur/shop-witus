import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

// Signed direct-to-Cloudinary image uploads for product images. Folder is
// fixed to the Shop.WitUS tenant prefix. Only imported by the server-side sign
// route (src/app/api/media/cloudinary-sign).

const FOLDER = "shopwitus/products";

function requireCloudinary(): { cloudName: string; apiKey: string; apiSecret: string } {
  if (
    !env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary is not configured.");
  }
  return {
    cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  const c = requireCloudinary();
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
    secure: true,
  });
  configured = true;
}

export interface SignedImageUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
}

export function signImageUpload(): SignedImageUpload {
  ensureConfigured();
  const c = requireCloudinary();
  const timestamp = Math.round(Date.now() / 1000);
  // Only these params are signed; the browser upload must send exactly these
  // (plus api_key + signature + file).
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder: FOLDER }, c.apiSecret);

  return {
    cloudName: c.cloudName,
    apiKey: c.apiKey,
    timestamp,
    signature,
    folder: FOLDER,
    uploadUrl: `https://api.cloudinary.com/v1_1/${c.cloudName}/image/upload`,
  };
}

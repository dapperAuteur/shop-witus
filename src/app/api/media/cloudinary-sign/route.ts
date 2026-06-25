import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { signImageUpload } from "@/lib/cloudinary";
import { hasCloudinary } from "@/lib/env";
import { getSession, getUserShopRole } from "@/lib/rbac";

const bodySchema = z.object({ shopId: z.string().uuid() });

// Returns short-lived signed params so the browser can upload a product image
// directly to Cloudinary. Manager+ of the shop only.
export async function POST(req: NextRequest) {
  if (!hasCloudinary) {
    return NextResponse.json({ error: "Image uploads aren't configured." }, { status: 503 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let shopId: string;
  try {
    shopId = bodySchema.parse(await req.json()).shopId;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const role = await getUserShopRole(session.user.id, shopId);
  if (role !== "owner" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(signImageUpload());
}

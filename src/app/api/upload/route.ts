import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { adminPermissions } from "@/lib/permissions";
import { requireRole } from "@/lib/rbac";
import { MAX_MENU_IMAGE_SIZE, verifyMenuImage } from "@/lib/menu-image";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const access = await requireRole(adminPermissions.menu, "api");
  if (access instanceof NextResponse) {
    return access;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu tải ảnh không hợp lệ" },
      { status: 400 },
    );
  }

  const files = [...formData.entries()].filter(([, value]) => value instanceof File);
  if (
    files.length !== 1 ||
    files[0]?.[0] !== "file" ||
    !(files[0][1] instanceof File)
  ) {
    return NextResponse.json(
      { error: "Vui lòng tải lên đúng một tệp ảnh" },
      { status: 400 },
    );
  }

  const file = files[0][1];
  if (file.size === 0 || file.size > MAX_MENU_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "Ảnh phải có dung lượng tối đa 2MB" },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const verified = verifyMenuImage(bytes, file.type);
  if (!verified) {
    return NextResponse.json(
      { error: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP đúng định dạng" },
      { status: 400 },
    );
  }

  const bucket = process.env.SUPABASE_BUCKET;
  if (!bucket) {
    return NextResponse.json(
      { error: "Supabase Storage chưa được cấu hình" },
      { status: 500 },
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const objectPath = `menu/${randomUUID()}.${verified.extension}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, bytes, {
        contentType: verified.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) {
      console.error("Supabase Storage upload failed:", error.message);
      return NextResponse.json(
        { error: "Không thể tải ảnh lên. Vui lòng thử lại" },
        { status: 502 },
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload menu image:", error);
    return NextResponse.json(
      { error: "Không thể tải ảnh lên. Vui lòng thử lại" },
      { status: 500 },
    );
  }
}

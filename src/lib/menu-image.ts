export const MAX_MENU_IMAGE_SIZE = 2 * 1024 * 1024;

export type VerifiedMenuImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

export function verifyMenuImage(
  bytes: Uint8Array,
  contentType: string,
): VerifiedMenuImage | null {
  if (
    contentType === "image/jpeg" &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { contentType, extension: "jpg" };
  }
  if (
    contentType === "image/png" &&
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType, extension: "png" };
  }
  if (
    contentType === "image/webp" &&
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType, extension: "webp" };
  }
  return null;
}

export function isMenuImageUrl(urlValue: string): boolean {
  if (typeof window !== "undefined") {
    return true;
  }

  const projectUrl = process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_BUCKET;
  if (!projectUrl || !bucket) {
    return false;
  }

  try {
    const url = new URL(urlValue);
    const project = new URL(projectUrl);
    const prefix = `/storage/v1/object/public/${encodeURIComponent(bucket)}/`;
    return (
      url.protocol === "https:" &&
      url.origin === project.origin &&
      url.pathname.startsWith(prefix) &&
      !url.pathname.includes("..")
    );
  } catch {
    return false;
  }
}

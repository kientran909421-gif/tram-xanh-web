import { Prisma } from "@prisma/client";
import { slugifyMenuName } from "@/lib/validations/menu";

export class MenuInputError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MenuInputError";
  }
}

export async function uniqueMenuSlug(
  transaction: Prisma.TransactionClient,
  source: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyMenuName(source);
  if (!base) {
    throw new MenuInputError("Không thể tạo slug từ tên món", 400);
  }
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const conflict = await transaction.menuItem.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!conflict) {
      return candidate;
    }
  }
  throw new MenuInputError("Không thể tạo slug duy nhất cho món", 409);
}

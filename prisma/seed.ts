import { hash } from "bcryptjs";
import {
  DiscountType,
  OptionGroup,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  Role,
} from "@prisma/client";

const prisma = new PrismaClient();
const defaultPassword = "Admin@123";

const staff = [
  { name: "Quản trị viên", email: "admin@cafe.local", role: Role.ADMIN },
  { name: "Quản lý", email: "manager@cafe.local", role: Role.MANAGER },
  { name: "Thu ngân", email: "cashier@cafe.local", role: Role.CASHIER },
  { name: "Pha chế", email: "barista@cafe.local", role: Role.BARISTA },
  { name: "Khách hàng mẫu", email: "customer@cafe.local", role: Role.CUSTOMER },
];

const categories = [
  { name: "Cà phê", slug: "ca-phe", sortOrder: 1 },
  { name: "Trà", slug: "tra", sortOrder: 2 },
  { name: "Sinh tố", slug: "sinh-to", sortOrder: 3 },
  { name: "Bánh", slug: "banh", sortOrder: 4 },
];

const drinks = [
  {
    name: "Cà phê sữa đá",
    slug: "ca-phe-sua-da",
    description: "Cà phê rang xay đậm đà cùng sữa đặc.",
    price: 29000,
    categorySlug: "ca-phe",
    toppings: [
      { name: "Thêm shot espresso", priceDelta: 8000 },
      { name: "Trân châu đen", priceDelta: 6000 },
      { name: "Kem cheese", priceDelta: 10000 },
    ],
  },
  {
    name: "Bạc xỉu",
    slug: "bac-xiu",
    description: "Vị sữa béo dịu hòa cùng cà phê thơm.",
    price: 32000,
    categorySlug: "ca-phe",
    toppings: [
      { name: "Thêm shot espresso", priceDelta: 8000 },
      { name: "Trân châu đen", priceDelta: 6000 },
      { name: "Kem cheese", priceDelta: 10000 },
    ],
  },
  {
    name: "Americano",
    slug: "americano",
    description: "Espresso pha loãng, hương vị cân bằng.",
    price: 35000,
    categorySlug: "ca-phe",
    toppings: [
      { name: "Thêm shot espresso", priceDelta: 8000 },
      { name: "Sữa tươi", priceDelta: 7000 },
    ],
  },
  {
    name: "Latte",
    slug: "latte",
    description: "Espresso kết hợp sữa tươi đánh nóng.",
    price: 42000,
    categorySlug: "ca-phe",
    toppings: [
      { name: "Thêm shot espresso", priceDelta: 8000 },
      { name: "Kem cheese", priceDelta: 10000 },
    ],
  },
  {
    name: "Trà đào cam sả",
    slug: "tra-dao-cam-sa",
    description: "Trà trái cây thanh mát với đào, cam và sả.",
    price: 39000,
    categorySlug: "tra",
    toppings: [
      { name: "Đào miếng", priceDelta: 8000 },
      { name: "Thạch trái cây", priceDelta: 6000 },
      { name: "Hạt chia", priceDelta: 5000 },
    ],
  },
  {
    name: "Trà vải",
    slug: "tra-vai",
    description: "Trà thơm nhẹ với vị ngọt dịu của vải.",
    price: 39000,
    categorySlug: "tra",
    toppings: [
      { name: "Vải thêm", priceDelta: 8000 },
      { name: "Thạch trái cây", priceDelta: 6000 },
      { name: "Hạt chia", priceDelta: 5000 },
    ],
  },
  {
    name: "Trà sen vàng",
    slug: "tra-sen-vang",
    description: "Trà sen thơm dịu, hậu vị ngọt thanh.",
    price: 42000,
    categorySlug: "tra",
    toppings: [
      { name: "Hạt sen", priceDelta: 8000 },
      { name: "Thạch trái cây", priceDelta: 6000 },
      { name: "Hạt chia", priceDelta: 5000 },
    ],
  },
  {
    name: "Trà chanh mật ong",
    slug: "tra-chanh-mat-ong",
    description: "Trà chanh tươi mát, thêm mật ong tự nhiên.",
    price: 35000,
    categorySlug: "tra",
    toppings: [
      { name: "Nha đam", priceDelta: 6000 },
      { name: "Thạch trái cây", priceDelta: 6000 },
      { name: "Hạt chia", priceDelta: 5000 },
    ],
  },
  {
    name: "Sinh tố bơ",
    slug: "sinh-to-bo",
    description: "Bơ tươi xay cùng sữa, sánh mịn và béo thơm.",
    price: 45000,
    categorySlug: "sinh-to",
    toppings: [
      { name: "Kem tươi", priceDelta: 10000 },
      { name: "Trân châu trắng", priceDelta: 6000 },
      { name: "Dừa khô", priceDelta: 5000 },
    ],
  },
  {
    name: "Sinh tố dâu",
    slug: "sinh-to-dau",
    description: "Dâu tây xay mát lạnh, chua ngọt tự nhiên.",
    price: 45000,
    categorySlug: "sinh-to",
    toppings: [
      { name: "Kem tươi", priceDelta: 10000 },
      { name: "Trân châu trắng", priceDelta: 6000 },
      { name: "Thạch trái cây", priceDelta: 6000 },
    ],
  },
  {
    name: "Sinh tố xoài",
    slug: "sinh-to-xoai",
    description: "Xoài chín xay cùng sữa chua mát lành.",
    price: 42000,
    categorySlug: "sinh-to",
    toppings: [
      { name: "Kem tươi", priceDelta: 10000 },
      { name: "Trân châu trắng", priceDelta: 6000 },
      { name: "Dừa khô", priceDelta: 5000 },
    ],
  },
  {
    name: "Sinh tố chuối cacao",
    slug: "sinh-to-chuoi-cacao",
    description: "Chuối chín xay cùng cacao và sữa tươi.",
    price: 39000,
    categorySlug: "sinh-to",
    toppings: [
      { name: "Kem tươi", priceDelta: 10000 },
      { name: "Trân châu trắng", priceDelta: 6000 },
      { name: "Dừa khô", priceDelta: 5000 },
    ],
  },
];

const pastries = [
  {
    name: "Bánh croissant bơ",
    slug: "banh-croissant-bo",
    description: "Bánh ngàn lớp thơm bơ, nướng vàng giòn.",
    price: 32000,
  },
  {
    name: "Tiramisu",
    slug: "tiramisu",
    description: "Bánh kem mascarpone vị cà phê và cacao.",
    price: 45000,
  },
  {
    name: "Cheesecake",
    slug: "cheesecake",
    description: "Bánh phô mai mềm mịn trên đế bánh quy.",
    price: 48000,
  },
  {
    name: "Muffin chocolate",
    slug: "muffin-chocolate",
    description: "Bánh muffin chocolate mềm ẩm, đậm vị cacao.",
    price: 28000,
  },
];

async function main() {
  const passwordHash = await hash(defaultPassword, 12);

  for (const user of staff) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        isActive: true,
      },
      create: { ...user, passwordHash },
    });
  }

  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: category,
    });
    categoryIds.set(category.slug, savedCategory.id);
  }

  for (const drink of drinks) {
    const { toppings, categorySlug, ...item } = drink;
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category for menu item: ${item.slug}`);
    }

    const savedItem = await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: { ...item, categoryId, isAvailable: true },
      create: { ...item, categoryId },
    });

    const options = [
      { group: OptionGroup.SIZE, name: "M", priceDelta: 0 },
      { group: OptionGroup.SIZE, name: "L", priceDelta: 7000 },
      { group: OptionGroup.ICE, name: "Ít đá", priceDelta: 0 },
      { group: OptionGroup.ICE, name: "Bình thường", priceDelta: 0 },
      { group: OptionGroup.ICE, name: "Nhiều đá", priceDelta: 0 },
      { group: OptionGroup.SUGAR, name: "Ít đường", priceDelta: 0 },
      { group: OptionGroup.SUGAR, name: "Bình thường", priceDelta: 0 },
      { group: OptionGroup.SUGAR, name: "Nhiều đường", priceDelta: 0 },
      ...toppings.map((topping) => ({
        group: OptionGroup.TOPPING,
        ...topping,
      })),
    ];

    for (const option of options) {
      const optionId = `${item.slug}-${option.group.toLowerCase()}-${option.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;

      await prisma.menuItemOption.upsert({
        where: { id: optionId },
        update: {
          ...option,
          menuItemId: savedItem.id,
          isAvailable: true,
        },
        create: { ...option, menuItemId: savedItem.id, id: optionId },
      });
    }
  }

  const pastryCategoryId = categoryIds.get("banh");
  if (!pastryCategoryId) {
    throw new Error("Missing pastry category");
  }

  for (const pastry of pastries) {
    await prisma.menuItem.upsert({
      where: { slug: pastry.slug },
      update: {
        ...pastry,
        categoryId: pastryCategoryId,
        isAvailable: true,
      },
      create: { ...pastry, categoryId: pastryCategoryId },
    });
  }

  const now = new Date();
  const startsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const promotions = [
    {
      code: "CAFE10",
      description: "Giảm 10% cho đơn từ 100.000đ.",
      type: DiscountType.PERCENT,
      value: 10,
      minOrder: 100000,
      maxDiscount: 30000,
    },
    {
      code: "CAFE15K",
      description: "Giảm 15.000đ cho đơn từ 80.000đ.",
      type: DiscountType.FIXED,
      value: 15000,
      minOrder: 80000,
      maxDiscount: null,
    },
  ];

  for (const promotion of promotions) {
    await prisma.promotion.upsert({
      where: { code: promotion.code },
      update: { ...promotion, startsAt, expiresAt, isActive: true },
      create: { ...promotion, startsAt, expiresAt },
    });
  }

  const [customer, cashier, barista, sampleItem] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "customer@cafe.local" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "cashier@cafe.local" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "barista@cafe.local" } }),
    prisma.menuItem.findUniqueOrThrow({ where: { slug: "ca-phe-sua-da" } }),
  ]);
  const deliveryFee = 15000;
  const orderSamples: {
    code: string;
    type: "TAKEAWAY" | "DELIVERY";
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    timeline: OrderStatus[];
  }[] = [
    {
      code: "DEMO-PENDING",
      type: "TAKEAWAY",
      status: "PENDING",
      paymentStatus: "UNPAID",
      timeline: ["PENDING"],
    },
    {
      code: "DEMO-PREPARING",
      type: "TAKEAWAY",
      status: "PREPARING",
      paymentStatus: "PAID",
      timeline: ["PENDING", "CONFIRMED", "PREPARING"],
    },
    {
      code: "DEMO-READY",
      type: "DELIVERY",
      status: "READY",
      paymentStatus: "UNPAID",
      timeline: ["PENDING", "CONFIRMED", "PREPARING", "READY"],
    },
    {
      code: "DEMO-OUT-FOR-DELIVERY",
      type: "DELIVERY",
      status: "OUT_FOR_DELIVERY",
      paymentStatus: "PAID",
      timeline: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "OUT_FOR_DELIVERY",
      ],
    },
    {
      code: "DEMO-COMPLETED",
      type: "TAKEAWAY",
      status: "COMPLETED",
      paymentStatus: "PAID",
      timeline: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "SERVED",
        "COMPLETED",
      ],
    },
  ];

  for (const sample of orderSamples) {
    const total = sampleItem.price + (sample.type === "DELIVERY" ? deliveryFee : 0);
    const timestamps = sample.timeline.map(
      (_, index) =>
        new Date(now.getTime() - (sample.timeline.length - index) * 5 * 60_000),
    );
    const statusUpdatedAt = timestamps[timestamps.length - 1] ?? now;
    await prisma.order.upsert({
      where: { code: sample.code },
      update: {},
      create: {
        code: sample.code,
        userId: customer.id,
        createdById: customer.id,
        assignedCashierId: cashier.id,
        assignedBaristaId: barista.id,
        customerName: customer.name,
        customerPhone: customer.phone ?? "0900000000",
        type: sample.type,
        ...(sample.type === "DELIVERY"
          ? { address: "Số 2 Lê Quang Đạo, Từ Liêm, Hà Nội" }
          : {}),
        status: sample.status,
        paymentStatus: sample.paymentStatus,
        statusUpdatedAt,
        subtotal: sampleItem.price,
        deliveryFee: sample.type === "DELIVERY" ? deliveryFee : 0,
        total,
        items: {
          create: {
            menuItemId: sampleItem.id,
            name: sampleItem.name,
            unitPrice: sampleItem.price,
            quantity: 1,
          },
        },
        payment: {
          create: {
            method: "CASH",
            status: sample.paymentStatus,
            amount: total,
            ...(sample.paymentStatus === "PAID"
              ? {
                  amountTendered: total + 10000,
                  changeDue: 10000,
                  paidAt: statusUpdatedAt,
                  confirmedById: cashier.id,
                }
              : {}),
          },
        },
        statusHistory: {
          create: sample.timeline.map((status, index) => {
            const changedByRole =
              status === "PENDING"
                ? Role.CUSTOMER
                : status === "PREPARING" || status === "READY"
                  ? Role.BARISTA
                  : Role.CASHIER;
            const changedById =
              changedByRole === Role.CUSTOMER
                ? customer.id
                : changedByRole === Role.BARISTA
                  ? barista.id
                  : cashier.id;
            return {
              fromStatus:
                index === 0 ? null : sample.timeline[index - 1] ?? null,
              toStatus: status,
              changedById,
              changedByRole,
              note: "Dữ liệu đơn hàng mẫu",
              createdAt: timestamps[index],
            };
          }),
        },
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Prisma seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

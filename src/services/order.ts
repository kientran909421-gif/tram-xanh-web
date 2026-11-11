import {
  DiscountType,
  OptionGroup,
  Prisma,
  type Prisma as PrismaTypes,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateOrderInput } from "@/lib/validations/order";
import { generateOrderCode } from "@/lib/order-code";
import { validatePromotion } from "@/services/promotion";
import { computeTotals } from "@/services/order-pricing";
import { writeAuditLog, type AuditActor } from "@/lib/audit-log";
import { DELIVERY_FEE } from "@/lib/site";

export class OrderError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

function isOrderCodeConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  if (typeof target === "string") {
    return target.toLowerCase().includes("code");
  }

  if (Array.isArray(target)) {
    return target.some(
      (field) => typeof field === "string" && field.toLowerCase() === "code",
    );
  }

  return false;
}

type CreatedOrder = { code: string; total: number };

async function createOrderAttempt(
  input: CreateOrderInput,
  actor: AuditActor | undefined,
  code: string,
): Promise<CreatedOrder> {
  return prisma.$transaction(async (transaction) => {
    const menuItemIds = [...new Set(input.items.map((item) => item.menuItemId))];
    const menuItems = await transaction.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        options: {
          select: {
            id: true,
            menuItemId: true,
            group: true,
            name: true,
            priceDelta: true,
            isAvailable: true,
          },
        },
      },
    });

    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
    const orderLines = input.items.map((line) => {
      const menuItem = menuItemById.get(line.menuItemId);
      if (!menuItem) {
        throw new OrderError(400, "Một hoặc nhiều món không tồn tại.");
      }
      if (new Set(line.optionIds).size !== line.optionIds.length) {
        throw new OrderError(400, `Tùy chọn của món "${menuItem.name}" bị trùng.`);
      }

      if (!menuItem.isAvailable) {
        throw new OrderError(409, `Món "${menuItem.name}" hiện đã hết hàng.`);
      }

      const optionById = new Map(
        menuItem.options.map((option) => [option.id, option]),
      );
      const options = line.optionIds.map((optionId) => {
        const option = optionById.get(optionId);
        if (!option || option.menuItemId !== menuItem.id) {
          throw new OrderError(
            400,
            `Tùy chọn của món "${menuItem.name}" không hợp lệ.`,
          );
        }

        if (!option.isAvailable) {
          throw new OrderError(
            409,
            `Tùy chọn "${option.name}" của món "${menuItem.name}" hiện không khả dụng.`,
          );
        }

        return option;
      });

      for (const group of [OptionGroup.SIZE, OptionGroup.ICE, OptionGroup.SUGAR]) {
        const groupOptions = menuItem.options.filter(
          (option) => option.group === group && option.isAvailable,
        );
        const selectedGroupOptions = options.filter(
          (option) => option.group === group,
        );
        if (
          selectedGroupOptions.length > 1 ||
          (groupOptions.length > 0 && selectedGroupOptions.length !== 1)
        ) {
          throw new OrderError(
            400,
            `Vui lòng chọn một tùy chọn ${group.toLowerCase()} cho món "${menuItem.name}".`,
          );
        }
      }

      return { input: line, menuItem, options };
    });

    const storeSettings = await transaction.storeSettings.findUnique({
      where: { id: "store" },
      select: {
        deliveryFee: true,
        allowCash: true,
        allowBankTransfer: true,
        allowMomo: true,
      },
    });
    const paymentAllowed =
      input.paymentMethod === "CASH"
        ? storeSettings?.allowCash ?? true
        : input.paymentMethod === "BANK_TRANSFER"
          ? storeSettings?.allowBankTransfer ?? true
          : storeSettings?.allowMomo ?? true;
    if (!paymentAllowed) {
      throw new OrderError(409, "Phương thức thanh toán này hiện không khả dụng.");
    }
    const deliveryFee = storeSettings?.deliveryFee ?? DELIVERY_FEE;

    const baseTotals = computeTotals(
      orderLines.map(({ input: line, menuItem, options }) => ({
        price: menuItem.price,
        quantity: line.quantity,
        options,
      })),
      null,
      input.type,
      deliveryFee,
    );

    let promotion:
      | {
          id: string;
          code: string;
          type: DiscountType;
          value: number;
          minOrder: number;
          maxDiscount: number | null;
          usageLimit: number | null;
          usedCount: number;
        }
      | undefined;

    if (input.promoCode) {
      const result = await validatePromotion(
        input.promoCode,
        baseTotals.subtotal,
        transaction,
      );
      if (!result.valid) {
        throw new OrderError(400, result.error);
      }
      promotion = result.promotion;
    }

    const totals = computeTotals(
      orderLines.map(({ input: line, menuItem, options }) => ({
        price: menuItem.price,
        quantity: line.quantity,
        options,
      })),
      promotion
        ? {
            type: promotion.type,
            value: promotion.value,
            maxDiscount: promotion.maxDiscount,
          }
        : null,
      input.type,
      deliveryFee,
    );

    if (promotion) {
      const usageUpdate = await transaction.promotion.updateMany({
        where: {
          id: promotion.id,
          ...(promotion.usageLimit !== null
            ? { usedCount: { lt: promotion.usageLimit } }
            : {}),
        },
        data: { usedCount: { increment: 1 } },
      });

      if (usageUpdate.count !== 1) {
        throw new OrderError(409, "Mã giảm giá đã hết lượt sử dụng.");
      }
    }

    const orderItems:
      PrismaTypes.OrderItemCreateWithoutOrderInput[] = orderLines.map(
        ({ input: line, menuItem, options }, index) => ({
          menuItem: { connect: { id: menuItem.id } },
          name: menuItem.name,
          unitPrice: totals.unitPrices[index],
          quantity: line.quantity,
          options: options.map((option) => ({
            id: option.id,
            group: option.group,
            name: option.name,
            priceDelta: option.priceDelta,
          })),
          ...(line.note !== undefined ? { note: line.note } : {}),
        }),
      );

    const createdOrder = await transaction.order.create({
      data: {
        code,
        ...(actor?.role === "CUSTOMER"
          ? { user: { connect: { id: actor.id } } }
          : {}),
        ...(actor?.id
          ? { createdBy: { connect: { id: actor.id } } }
          : {}),
        ...(actor?.role === "CASHIER"
          ? { assignedCashier: { connect: { id: actor.id } } }
          : {}),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        type: input.type,
        ...(input.type === "DELIVERY" ? { address: input.address } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        status: "PENDING",
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        ...(promotion ? { promotion: { connect: { id: promotion.id } } } : {}),
        items: { create: orderItems },
        payment: {
          create: {
            method: input.paymentMethod,
            status: "PENDING",
            amount: totals.total,
          },
        },
      },
      select: { code: true, total: true },
    });
    await writeAuditLog(transaction, actor ?? null, {
      action: "ORDER_CREATED",
      entityType: "Order",
      entityId: createdOrder.code,
      details: {
        status: "PENDING",
        total: totals.total,
        source: actor?.role === "CASHIER" ? "counter" : "checkout",
        guestOrder: !actor,
      },
    });

    return { code, total: totals.total };
  });
}

export async function createOrder(
  input: CreateOrderInput,
  actor?: AuditActor,
): Promise<CreatedOrder> {
  for (let attempt = 0; attempt <= 5; attempt += 1) {
    const code = generateOrderCode();
    try {
      return await createOrderAttempt(input, actor, code);
    } catch (error) {
      if (isOrderCodeConflict(error) && attempt < 5) {
        continue;
      }
      if (isOrderCodeConflict(error)) {
        throw new OrderError(
          503,
          "Không thể tạo mã đơn hàng lúc này. Vui lòng thử lại.",
        );
      }
      throw error;
    }
  }

  throw new OrderError(503, "Không thể tạo đơn hàng lúc này.");
}

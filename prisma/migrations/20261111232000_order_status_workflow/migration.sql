ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'SERVED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED'
);

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order"
ALTER COLUMN "status" TYPE "OrderStatus"
USING (
    CASE
        WHEN "status"::text = 'DELIVERING' AND "type"::text = 'DELIVERY'
            THEN 'OUT_FOR_DELIVERY'
        WHEN "status"::text = 'DELIVERING'
            THEN 'SERVED'
        ELSE "status"::text
    END
)::"OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "OrderStatus_old";

ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM (
    'UNPAID',
    'PAID',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
);
CREATE TYPE "CancellationRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment"
ALTER COLUMN "status" TYPE "PaymentStatus"
USING (
    CASE
        WHEN "status"::text IN ('PENDING', 'CANCELLED') THEN 'UNPAID'
        ELSE "status"::text
    END
)::"PaymentStatus";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'UNPAID';
DROP TYPE "PaymentStatus_old";

ALTER TABLE "Order"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Order" AS orders
SET "paymentStatus" = payments."status"
FROM "Payment" AS payments
WHERE payments."orderId" = orders."id";

ALTER TABLE "Payment"
ADD COLUMN "refundedAmount" INTEGER NOT NULL DEFAULT 0;
UPDATE "Payment"
SET "refundedAmount" = "amount"
WHERE "status" = 'REFUNDED';

CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "changedById" TEXT,
    "changedByRole" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx"
ON "OrderStatusHistory"("orderId", "createdAt");

ALTER TABLE "OrderStatusHistory"
ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "OrderStatusHistory" (
    "id",
    "orderId",
    "fromStatus",
    "toStatus",
    "note",
    "createdAt"
)
SELECT
    'snapshot-' || "id",
    "id",
    NULL,
    "status",
    'Trạng thái hiện tại khi bật lịch sử; không có dữ liệu lịch sử trước đó.',
    "statusUpdatedAt"
FROM "Order";

CREATE TABLE "OrderCancellationRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "OrderCancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderCancellationRequest_status_createdAt_idx"
ON "OrderCancellationRequest"("status", "createdAt");
CREATE INDEX "OrderCancellationRequest_orderId_status_idx"
ON "OrderCancellationRequest"("orderId", "status");

ALTER TABLE "OrderCancellationRequest"
ADD CONSTRAINT "OrderCancellationRequest_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

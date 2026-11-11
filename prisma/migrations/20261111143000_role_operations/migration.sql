ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "OptionGroup" ADD VALUE 'ICE';
ALTER TYPE "OptionGroup" ADD VALUE 'SUGAR';

CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIPT', 'ADJUSTMENT', 'WASTE');
CREATE TYPE "InventoryAlertStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

ALTER TABLE "Order"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "assignedCashierId" TEXT,
ADD COLUMN "assignedBaristaId" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "confirmedById" TEXT,
ADD COLUMN "amountTendered" INTEGER,
ADD COLUMN "changeDue" INTEGER;

CREATE TABLE "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryIngredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "lowStockAt" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryIngredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'store',
    "storeName" TEXT NOT NULL DEFAULT 'TRẠM XANH',
    "address" TEXT NOT NULL DEFAULT 'Số 2 Lê Quang Đạo, Từ Liêm, Hà Nội',
    "phone" TEXT NOT NULL DEFAULT '0366 263 190',
    "email" TEXT NOT NULL DEFAULT 'hello@tramxanh.com',
    "openingTime" TEXT NOT NULL DEFAULT '07:00',
    "closingTime" TEXT NOT NULL DEFAULT '22:00',
    "deliveryFee" INTEGER NOT NULL DEFAULT 15000,
    "customerCancelMinutes" INTEGER NOT NULL DEFAULT 0,
    "allowCash" BOOLEAN NOT NULL DEFAULT true,
    "allowBankTransfer" BOOLEAN NOT NULL DEFAULT true,
    "allowMomo" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryAlert" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT,
    "reportedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "message" TEXT NOT NULL,
    "status" "InventoryAlertStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductReview_orderItemId_key" ON "ProductReview"("orderItemId");
CREATE INDEX "UserAddress_userId_isDefault_idx" ON "UserAddress"("userId", "isDefault");
CREATE INDEX "ProductReview_menuItemId_isVisible_createdAt_idx" ON "ProductReview"("menuItemId", "isVisible", "createdAt");
CREATE INDEX "ProductReview_userId_createdAt_idx" ON "ProductReview"("userId", "createdAt");
CREATE UNIQUE INDEX "InventoryIngredient_name_key" ON "InventoryIngredient"("name");
CREATE INDEX "InventoryIngredient_isActive_name_idx" ON "InventoryIngredient"("isActive", "name");
CREATE INDEX "InventoryMovement_ingredientId_createdAt_idx" ON "InventoryMovement"("ingredientId", "createdAt");
CREATE INDEX "InventoryMovement_actorId_createdAt_idx" ON "InventoryMovement"("actorId", "createdAt");
CREATE INDEX "InventoryAlert_status_createdAt_idx" ON "InventoryAlert"("status", "createdAt");
CREATE INDEX "InventoryAlert_ingredientId_status_idx" ON "InventoryAlert"("ingredientId", "status");
CREATE INDEX "InventoryAlert_reportedById_createdAt_idx" ON "InventoryAlert"("reportedById", "createdAt");
CREATE INDEX "Order_createdById_createdAt_idx" ON "Order"("createdById", "createdAt");
CREATE INDEX "Order_assignedCashierId_status_createdAt_idx" ON "Order"("assignedCashierId", "status", "createdAt");
CREATE INDEX "Order_assignedBaristaId_status_createdAt_idx" ON "Order"("assignedBaristaId", "status", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedCashierId_fkey"
FOREIGN KEY ("assignedCashierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedBaristaId_fkey"
FOREIGN KEY ("assignedBaristaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_confirmedById_fkey"
FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_menuItemId_fkey"
FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_ingredientId_fkey"
FOREIGN KEY ("ingredientId") REFERENCES "InventoryIngredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_ingredientId_fkey"
FOREIGN KEY ("ingredientId") REFERENCES "InventoryIngredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_reportedById_fkey"
FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_resolvedById_fkey"
FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "StoreSettings" ("id", "updatedAt") VALUES ('store', CURRENT_TIMESTAMP);

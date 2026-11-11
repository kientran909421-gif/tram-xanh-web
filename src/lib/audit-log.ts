import type { Prisma } from "@prisma/client";
import type { AuthRole } from "@/lib/auth.config";

type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

export type AuditActor = {
  id: string;
  email?: string | null;
  role?: AuthRole;
};

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
};

export async function writeAuditLog(
  transaction: AuditClient,
  actor: AuditActor | null,
  entry: AuditEntry,
) {
  await transaction.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      actorRole: actor?.role ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
    },
  });
}

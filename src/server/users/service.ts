import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertUserPassword, passwordRejectionReason } from "@/lib/env";
import { hashPassword } from "@/server/auth/hash";
import { writeAudit } from "@/server/audit";
import { nowServer } from "@/lib/timezone";
import { assertKeepsLastSuperAdmin, LAST_SUPER_ADMIN_LOCK } from "@/server/users/last-admin";

function rejectPassword(password: string, email: string | undefined, ctx: z.RefinementCtx) {
  const reason = passwordRejectionReason(password, email);
  if (reason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: reason });
  }
}

export const createUserSchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().min(2),
    password: z.string(),
    role: z.nativeEnum(Role),
  })
  .superRefine((value, ctx) => rejectPassword(value.password, value.email, ctx));

export const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    fullName: z.string().min(2).optional(),
    password: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.password) rejectPassword(value.password, value.email, ctx);
  });

export async function listUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      rider: { select: { id: true, fullName: true } },
    },
  });
}

export async function createUser(actorId: string, input: z.infer<typeof createUserSchema>) {
  const data = createUserSchema.parse(input);
  const email = data.email.toLowerCase().trim();
  assertUserPassword(data.password, email);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Cet email est déjà utilisé.");
  }
  const user = await db.user.create({
    data: {
      email,
      fullName: data.fullName.trim(),
      role: data.role,
      passwordHash: await hashPassword(data.password),
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "CREATE_USER",
    module: "users",
    newValue: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
  });
  return user;
}

export async function updateUser(actorId: string, id: string, input: z.infer<typeof updateUserSchema>) {
  const data = updateUserSchema.parse(input);
  if (data.password) assertUserPassword(data.password, data.email);

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(CAST(hashtext(${LAST_SUPER_ADMIN_LOCK}) AS bigint))`;
    const existing = await tx.user.findUniqueOrThrow({ where: { id } });
    if (data.password) assertUserPassword(data.password, data.email ?? existing.email);
    const nextRole = data.role ?? existing.role;
    const nextActive = data.isActive ?? existing.isActive;
    const otherActiveSuperAdmins = await tx.user.count({
      where: { role: Role.SUPER_ADMIN, isActive: true, NOT: { id } },
    });
    assertKeepsLastSuperAdmin({
      operation: "update",
      existingRole: existing.role,
      existingActive: existing.isActive,
      nextRole,
      nextActive,
      otherActiveSuperAdmins,
    });
    const user = await tx.user.update({
      where: { id },
      data: {
        email: data.email?.toLowerCase().trim(),
        fullName: data.fullName?.trim(),
        role: data.role,
        isActive: data.isActive,
        passwordHash: data.password ? await hashPassword(data.password) : undefined,
        updatedAt: nowServer(),
      },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: data.isActive === false ? "DEACTIVATE_USER" : "UPDATE_USER",
      module: "users",
      oldValue: { email: existing.email, role: existing.role, isActive: existing.isActive, fullName: existing.fullName },
      newValue: { email: user.email, role: user.role, isActive: user.isActive, fullName: user.fullName },
    });
    return user;
  });
}

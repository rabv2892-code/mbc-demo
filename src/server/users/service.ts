import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/server/auth/hash";
import { writeAudit } from "@/server/audit";
import { nowServer } from "@/lib/timezone";

export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
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
  const existing = await db.user.findUniqueOrThrow({ where: { id } });
  const user = await db.user.update({
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
  await writeAudit(db, {
    userId: actorId,
    action: data.isActive === false ? "DEACTIVATE_USER" : "UPDATE_USER",
    module: "users",
    oldValue: { email: existing.email, role: existing.role, isActive: existing.isActive, fullName: existing.fullName },
    newValue: { email: user.email, role: user.role, isActive: user.isActive, fullName: user.fullName },
  });
  return user;
}

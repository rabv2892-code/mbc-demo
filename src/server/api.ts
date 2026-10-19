import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError, requireSession, type SessionUser } from "@/server/auth/session";
import { assertRole } from "@/server/rbac";
import type { Role } from "@prisma/client";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

function isTechnicalMessage(message: string) {
  return /prisma|TURBOPACK|invocation in|node_modules|Unique constraint failed|Invalid `prisma|\\\\src\\\\|\\\\.next\\\\/i.test(
    message,
  );
}

function prismaUserMessage(error: Prisma.PrismaClientKnownRequestError) {
  const target = Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(" ") : String(error.meta?.target ?? "");
  if (error.code === "P2002") {
    if (target.includes("kind") && target.includes("name")) {
      return "Ce type existe déjà. Choisissez un autre nom ou cliquez sur Modifier.";
    }
    if (target.includes("email")) return "Cet email est déjà utilisé.";
    if (target.includes("plate")) return "Cette immatriculation existe déjà.";
    if (target.includes("userId")) return "Cet utilisateur est déjà lié à un motard.";
    return "Cet enregistrement existe déjà.";
  }
  if (error.code === "P2025") return "Enregistrement introuvable.";
  if (error.code === "P2003") return "Donnée liée introuvable. Vérifiez le type ou la moto choisie.";
  return "Opération impossible. Vérifiez les informations saisies.";
}

function zodUserMessage(error: ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Données invalides";
  const field = issue.path.join(".");
  if (issue.code === "too_small") {
    if (field.includes("Price") || field.includes("price") || field.includes("Amount")) {
      return "Indiquez un prix supérieur à 0.";
    }
    if (field.includes("quantity") || field.includes("Count") || field.includes("Qty")) {
      return "Indiquez une quantité supérieure à 0.";
    }
    if (field === "name" || field === "fullName") return "Indiquez un nom.";
    return "Une valeur est trop petite. Vérifiez les champs.";
  }
  if (issue.code === "invalid_type" || issue.code === "invalid_enum_value") {
    return "Vérifiez les champs du formulaire.";
  }
  return "Données invalides. Vérifiez les champs saisis.";
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json({ error: prismaUserMessage(error) }, { status: 400 });
  }
  if (error instanceof Error) {
    const message = isTechnicalMessage(error.message)
      ? "Une erreur s'est produite. Vérifiez les informations saisies."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}

export async function withAuth(roles: readonly Role[], handler: (user: SessionUser) => Promise<NextResponse>) {
  try {
    const user = await requireSession();
    assertRole(user, roles);
    return await handler(user);
  } catch (error) {
    return errorResponse(error);
  }
}

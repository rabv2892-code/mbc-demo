import { MotorcycleOwnership, MotorcycleStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { nowServer } from "@/lib/timezone";
import { writeAudit } from "@/server/audit";
import { amortizationAmount, motorcycleTotalCost, nextMotorcycleProgress } from "@/lib/calc/transport";
import { gnfAmountOrZeroSchema, gnfAmountSchema, positiveQtySchema } from "@/lib/validation";

export const motorcycleSchema = z.object({
  plate: z.string().min(2),
  brand: z.string().min(1),
  model: z.string().min(1),
  ownership: z.nativeEnum(MotorcycleOwnership).optional(),
  ownerName: z.string().trim().optional().nullable(),
  purchaseDate: z.string().min(4),
  purchasePrice: gnfAmountOrZeroSchema,
  insuranceFee: gnfAmountOrZeroSchema.default(0),
  registrationFee: gnfAmountOrZeroSchema.default(0),
  equipmentFee: gnfAmountOrZeroSchema.default(0),
  maintenanceFee: gnfAmountOrZeroSchema.default(0),
  otherFees: gnfAmountOrZeroSchema.default(0),
  status: z.nativeEnum(MotorcycleStatus).optional(),
});

export const motorcycleExpenseSchema = z.object({
  motorcycleId: z.string(),
  label: z.string().min(1),
  amount: gnfAmountSchema,
  notes: z.string().optional(),
});

export const riderSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  userId: z.string().optional().nullable(),
  motorcycleId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const deliverySchema = z.object({
  client: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  amount: gnfAmountSchema,
  distanceKm: positiveQtySchema.optional(),
  comment: z.string().optional(),
});

export const businessSettingsSchema = z.object({
  amortizationPercentPerDelivery: z.coerce.number().min(0).max(100),
  nextMotorcycleTarget: gnfAmountSchema,
});

export async function getBusinessSettings() {
  const settings = await db.businessSettings.findFirst();
  if (!settings) throw new Error("Paramètres entreprise manquants");
  return settings;
}

export async function updateBusinessSettings(actorId: string, input: z.infer<typeof businessSettingsSchema>) {
  const data = businessSettingsSchema.parse(input);
  const current = await getBusinessSettings();
  const updated = await db.businessSettings.update({
    where: { id: current.id },
    data: {
      amortizationPercentPerDelivery: data.amortizationPercentPerDelivery,
      nextMotorcycleTarget: data.nextMotorcycleTarget,
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "UPDATE_BUSINESS_SETTINGS",
    module: "settings",
    oldValue: {
      amortizationPercentPerDelivery: current.amortizationPercentPerDelivery.toString(),
      nextMotorcycleTarget: current.nextMotorcycleTarget.toString(),
    },
    newValue: {
      amortizationPercentPerDelivery: updated.amortizationPercentPerDelivery.toString(),
      nextMotorcycleTarget: updated.nextMotorcycleTarget.toString(),
    },
  });
  return updated;
}

export async function createMotorcycle(actorId: string, input: z.infer<typeof motorcycleSchema>) {
  const data = motorcycleSchema.parse(input);
  const plate = data.plate.trim().toUpperCase();
  const existingPlate = await db.motorcycle.findUnique({ where: { plate } });
  if (existingPlate) {
    throw new Error(`La moto ${plate} existe déjà.`);
  }
  const total = motorcycleTotalCost(data);
  const moto = await db.motorcycle.create({
    data: {
      plate,
      brand: data.brand.trim(),
      model: data.model.trim(),
      ownership: data.ownership ?? "OWNED",
      ownerName: data.ownership === "PARTNER" ? data.ownerName || null : null,
      purchaseDate: new Date(data.purchaseDate),
      purchasePrice: data.purchasePrice,
      insuranceFee: data.insuranceFee,
      registrationFee: data.registrationFee,
      equipmentFee: data.equipmentFee,
      maintenanceFee: data.maintenanceFee,
      otherFees: data.otherFees,
      totalCost: total,
      status: data.status ?? "ACTIVE",
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "CREATE_MOTORCYCLE",
    module: "transport",
    newValue: { id: moto.id, plate: moto.plate, totalCost: total.toString() },
  });
  return moto;
}

export async function updateMotorcycle(actorId: string, id: string, input: z.infer<typeof motorcycleSchema>) {
  const data = motorcycleSchema.parse(input);
  const total = motorcycleTotalCost(data);
  const existing = await db.motorcycle.findUniqueOrThrow({ where: { id } });
  const moto = await db.motorcycle.update({
    where: { id },
    data: {
      plate: data.plate.trim().toUpperCase(),
      brand: data.brand.trim(),
      model: data.model.trim(),
      ownership: data.ownership ?? existing.ownership,
      ownerName: (data.ownership ?? existing.ownership) === "PARTNER" ? data.ownerName || existing.ownerName : null,
      purchaseDate: new Date(data.purchaseDate),
      purchasePrice: data.purchasePrice,
      insuranceFee: data.insuranceFee,
      registrationFee: data.registrationFee,
      equipmentFee: data.equipmentFee,
      maintenanceFee: data.maintenanceFee,
      otherFees: data.otherFees,
      totalCost: total,
      status: data.status ?? existing.status,
    },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "UPDATE_MOTORCYCLE",
    module: "transport",
    oldValue: { plate: existing.plate, totalCost: existing.totalCost.toString(), status: existing.status },
    newValue: { plate: moto.plate, totalCost: total.toString(), status: moto.status },
  });
  return moto;
}

export async function addMotorcycleExpense(actorId: string, input: z.infer<typeof motorcycleExpenseSchema>) {
  const data = motorcycleExpenseSchema.parse(input);
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const expense = await tx.motorcycleExpense.create({
      data: {
        motorcycleId: data.motorcycleId,
        label: data.label,
        amount: data.amount,
        notes: data.notes,
        occurredAt,
      },
    });
    const moto = await tx.motorcycle.findUniqueOrThrow({ where: { id: data.motorcycleId } });
    const extra = Number(moto.otherFees) + data.amount;
    const total = motorcycleTotalCost({
      purchasePrice: moto.purchasePrice,
      insuranceFee: moto.insuranceFee,
      registrationFee: moto.registrationFee,
      equipmentFee: moto.equipmentFee,
      maintenanceFee: moto.maintenanceFee,
      otherFees: extra,
    });
    await tx.motorcycle.update({
      where: { id: moto.id },
      data: { otherFees: extra, totalCost: total },
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_MOTORCYCLE_EXPENSE",
      module: "transport",
      newValue: { motorcycleId: data.motorcycleId, label: data.label, amount: data.amount },
    });
    return expense;
  });
}

export async function listMotorcycles() {
  return db.motorcycle.findMany({
    include: { expenses: true, riders: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRider(actorId: string, input: z.infer<typeof riderSchema>) {
  const data = riderSchema.parse(input);
  const rider = await db.rider.create({
    data: {
      fullName: data.fullName.trim(),
      phone: data.phone,
      userId: data.userId || null,
      motorcycleId: data.motorcycleId || null,
      isActive: data.isActive ?? true,
    },
    include: { user: { select: { id: true, email: true, fullName: true } }, motorcycle: true },
  });
  await writeAudit(db, {
    userId: actorId,
    action: "CREATE_RIDER",
    module: "transport",
    newValue: { id: rider.id, fullName: rider.fullName, userId: rider.userId },
  });
  return rider;
}

export async function updateRider(actorId: string, id: string, input: z.infer<typeof riderSchema>) {
  const data = riderSchema.parse(input);
  const existing = await db.rider.findUniqueOrThrow({ where: { id } });
  const rider = await db.rider.update({
    where: { id },
    data: {
      fullName: data.fullName.trim(),
      phone: data.phone,
      userId: data.userId || null,
      motorcycleId: data.motorcycleId || null,
      isActive: data.isActive ?? existing.isActive,
    },
    include: { user: { select: { id: true, email: true, fullName: true } }, motorcycle: true },
  });
  await writeAudit(db, {
    userId: actorId,
    action: data.isActive === false ? "DEACTIVATE_RIDER" : "UPDATE_RIDER",
    module: "transport",
    oldValue: { fullName: existing.fullName, isActive: existing.isActive, userId: existing.userId },
    newValue: { fullName: rider.fullName, isActive: rider.isActive, userId: rider.userId },
  });
  return rider;
}

export async function listRiders() {
  return db.rider.findMany({
    include: {
      user: { select: { id: true, email: true, fullName: true } },
      motorcycle: { select: { id: true, plate: true } },
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDelivery(actorId: string, input: z.infer<typeof deliverySchema>, riderId: string) {
  const data = deliverySchema.parse(input);
  const occurredAt = nowServer();
  return db.$transaction(async (tx) => {
    const rider = await tx.rider.findUnique({
      where: { id: riderId },
      include: { motorcycle: { select: { ownership: true } } },
    });
    if (!rider || !rider.isActive) {
      throw new Error("Motard introuvable ou inactif");
    }
    const settings = await tx.businessSettings.findFirst();
    if (!settings) throw new Error("Paramètres entreprise manquants");
    const ownedMoto = rider.motorcycle?.ownership === "OWNED";
    const amort = ownedMoto
      ? amortizationAmount(data.amount, settings.amortizationPercentPerDelivery)
      : amortizationAmount(data.amount, 0);
    const delivery = await tx.delivery.create({
      data: {
        client: data.client.trim(),
        origin: data.origin.trim(),
        destination: data.destination.trim(),
        amount: data.amount,
        distanceKm: data.distanceKm,
        comment: data.comment,
        occurredAt,
        riderId,
        employeeId: actorId,
      },
      include: {
        rider: { select: { id: true, fullName: true } },
        employee: { select: { id: true, fullName: true } },
        amortization: true,
      },
    });
    if (ownedMoto && amort.gt(0)) {
      await tx.amortizationEntry.create({
        data: {
          deliveryId: delivery.id,
          amount: amort,
          percent: settings.amortizationPercentPerDelivery,
          occurredAt,
        },
      });
    }
    await writeAudit(tx, {
      userId: actorId,
      action: "CREATE_DELIVERY",
      module: "transport",
      newValue: {
        client: data.client,
        amount: data.amount,
        amortization: amort.toString(),
        riderId,
      },
    });
    return tx.delivery.findUniqueOrThrow({
      where: { id: delivery.id },
      include: {
        rider: { select: { id: true, fullName: true } },
        employee: { select: { id: true, fullName: true } },
        amortization: true,
      },
    });
  });
}

export async function listDeliveries(filters: {
  q?: string;
  from?: Date;
  to?: Date;
  employeeId?: string;
  riderId?: string;
}) {
  return db.delivery.findMany({
    where: {
      employeeId: filters.employeeId,
      riderId: filters.riderId,
      occurredAt: { gte: filters.from, lte: filters.to },
      OR: filters.q
        ? [
            { client: { contains: filters.q, mode: "insensitive" } },
            { origin: { contains: filters.q, mode: "insensitive" } },
            { destination: { contains: filters.q, mode: "insensitive" } },
            { rider: { fullName: { contains: filters.q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: {
      rider: { select: { id: true, fullName: true } },
      employee: { select: { id: true, fullName: true } },
      amortization: true,
    },
    orderBy: { occurredAt: "desc" },
  });
}

export async function getRiderByUserId(userId: string) {
  return db.rider.findUnique({ where: { userId } });
}

export async function amortizationSummary() {
  const [settings, agg, motoCount] = await Promise.all([
    getBusinessSettings(),
    db.amortizationEntry.aggregate({ _sum: { amount: true } }),
    db.motorcycle.count({ where: { ownership: "OWNED" } }),
  ]);
  const fund = Number(agg._sum.amount ?? 0);
  const progress = nextMotorcycleProgress(fund, settings.nextMotorcycleTarget);
  return {
    settings,
    motorcycleCount: motoCount,
    progress: {
      fund: progress.fund.toString(),
      target: progress.target.toString(),
      remaining: progress.remaining.toString(),
      percent: progress.percent.toString(),
    },
  };
}

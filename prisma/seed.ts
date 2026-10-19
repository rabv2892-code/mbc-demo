import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  allowDemoAccounts,
  assertPublicAdminPassword,
  assertSeedEmail,
} from "../src/lib/env";
import { seedFixtureData } from "./seed-fixtures";

const db = new PrismaClient();

type LocalAccount = {
  email: string;
  password: string;
  fullName: string;
  role: Role;
};

async function ensureSettings() {
  if ((await db.coffeeSettings.count()) === 0) {
    await db.coffeeSettings.create({
      data: { cupsPerKg: 50, purchasePricePerKg: 40000, cupSalePrice: 5000, offerWaterWithCoffee: true },
    });
  }

  if ((await db.waterSettings.count()) === 0) {
    await db.waterSettings.create({
      data: { sachetSalePrice: 1000, sachetsPerPack: 5 },
    });
  }

  if ((await db.liptonSettings.count()) === 0) {
    await db.liptonSettings.create({
      data: { pieceSalePrice: 2000, piecesPerPack: 100 },
    });
  }

  if ((await db.businessSettings.count()) === 0) {
    await db.businessSettings.create({
      data: {
        amortizationPercentPerDelivery: 20,
        nextMotorcycleTarget: 15_000_000,
      },
    });
  }
}

function readLocalAccount(
  emailKey: string,
  passwordKey: string,
  fullName: string,
  role: Role,
): LocalAccount | null {
  const email = process.env[emailKey]?.trim();
  const password = process.env[passwordKey];
  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error(`${emailKey} et ${passwordKey} doivent être fournis ensemble.`);
  }
  assertPublicAdminPassword(password);
  return {
    email: assertSeedEmail(email),
    password,
    fullName,
    role,
  };
}

async function upsertLocalUser(account: LocalAccount) {
  const passwordHash = await bcrypt.hash(account.password, 12);
  return db.user.upsert({
    where: { email: account.email },
    update: {},
    create: {
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      passwordHash,
    },
  });
}

async function seedLocalAccountsFromEnv() {
  const admin = readLocalAccount("LOCAL_ADMIN_EMAIL", "LOCAL_ADMIN_PASSWORD", "Super Admin", Role.SUPER_ADMIN);
  const seller = readLocalAccount("LOCAL_SELLER_EMAIL", "LOCAL_SELLER_PASSWORD", "Vendeur café", Role.ADMIN_CAFE);
  const rider = readLocalAccount("LOCAL_RIDER_EMAIL", "LOCAL_RIDER_PASSWORD", "Livreur", Role.MOTARD);

  if (!admin && !seller && !rider) {
    console.log("Seed: paramètres OK, aucun compte local créé (variables LOCAL_* absentes).");
    return;
  }

  if (admin) await upsertLocalUser(admin);
  if (seller) await upsertLocalUser(seller);
  if (rider) {
    const riderUser = await upsertLocalUser(rider);
    if ((await db.rider.count()) === 0) {
      await db.rider.create({
        data: {
          fullName: "Livreur",
          phone: "620000000",
          userId: riderUser.id,
        },
      });
    }
  }
  console.log("Seed: comptes locaux créés ou déjà présents.");
}

async function ensureBootstrapAdmin() {
  const emailRaw = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!emailRaw || !password) return;
  const email = assertSeedEmail(emailRaw);
  assertPublicAdminPassword(password);

  const existingAdmin = await db.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  if (existingAdmin) {
    console.log("Seed: un Super Admin existe déjà, aucun compte bootstrap créé.");
    return;
  }

  await db.user.create({
    data: {
      email,
      fullName: "Super Admin",
      role: Role.SUPER_ADMIN,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.log("Seed: Super Admin créé.");
}

async function main() {
  await ensureSettings();

  if (allowDemoAccounts()) {
    await seedLocalAccountsFromEnv();
    console.log("Seed OK (mode local).");
    return;
  }

  await ensureBootstrapAdmin();
  await seedFixtureData(db);
  console.log("Seed OK (aucun compte de développement local créé).");
}

main()
  .catch((e) => {
    const message = e instanceof Error ? e.message : "Seed impossible.";
    console.error(/postgresql:\/\/|password=/i.test(message) ? "Seed impossible." : message);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

const PLACEHOLDER_JWT_MARKERS = [
  "mbc-dev-jwt-secret-change-in-production-32chars",
  "change-this-to-a-long-random-secret-in-production",
  "change-this",
  "change-in-production",
  "remplacer_par_un_secret",
];

export const MIN_JWT_SECRET_LENGTH = 32;

export function isPlaceholderJwtSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_JWT_MARKERS.some((marker) => normalized.includes(marker.toLowerCase()));
}

export function requireJwtSecret(value = process.env.JWT_SECRET): string {
  const secret = value?.trim() ?? "";
  if (!secret) {
    throw new Error("JWT_SECRET manquant. Définissez un secret d'au moins 32 caractères.");
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error("JWT_SECRET trop court (32 caractères minimum).");
  }
  if (isPlaceholderJwtSecret(secret)) {
    throw new Error("JWT_SECRET invalide : remplacez la valeur d'exemple par un secret unique.");
  }
  return secret;
}

export function isProductionRuntime(): boolean {
  return process.env.MBC_ENV === "production" || process.env.NODE_ENV === "production";
}

const FORBIDDEN_PUBLIC_PASSWORDS = ["admin1234!", "cafe1234!", "moto1234!", "admin1234", "cafe1234", "moto1234"];

const COMMON_PASSWORDS = [
  "password",
  "password123",
  "password1234",
  "motdepasse",
  "motdepasse123",
  "motdepasse1234",
  "azerty",
  "azerty123",
  "azerty123456",
  "qwerty",
  "qwerty123",
  "qwerty123456",
  "123456789012",
  "123456789",
  "admin",
  "admin123",
  "administrateur",
  "administrateur1",
  "marouane",
  "marouane123",
  "marouane1234",
  "changeme",
  "changeme123",
  "welcome1234",
  "letmein1234",
];

export function allowDemoAccounts(): boolean {
  if (process.env.MBC_ENV === "production" || process.env.MBC_ENV === "demo" || process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.ALLOW_DEMO_ACCOUNTS !== "false";
}

export function passwordRejectionReason(password: string, email?: string): string | null {
  const normalized = password.trim().toLowerCase();
  if (
    FORBIDDEN_PUBLIC_PASSWORDS.includes(normalized) ||
    normalized.includes("change-this") ||
    normalized.includes("remplacer") ||
    normalized.includes("mot-de-passe-long")
  ) {
    return "Ce mot de passe de développement local est interdit.";
  }
  if (password.length < 12) {
    return "Le mot de passe est trop court (12 caractères minimum).";
  }
  if (COMMON_PASSWORDS.includes(normalized)) {
    return "Ce mot de passe est trop courant.";
  }
  const emailNormalized = email?.trim().toLowerCase() ?? "";
  const localPart = emailNormalized.split("@")[0] ?? "";
  if (emailNormalized && (normalized === emailNormalized || (localPart.length >= 4 && normalized === localPart))) {
    return "Le mot de passe ne doit pas reprendre l'adresse e-mail.";
  }
  return null;
}

export function assertUserPassword(password: string, email?: string): void {
  const reason = passwordRejectionReason(password, email);
  if (reason) throw new Error(reason);
}

export function assertPublicAdminPassword(password: string): void {
  assertUserPassword(password);
}

export function fixtureDataBlockReason(
  env: {
    SEED_FIXTURE_DATA?: string;
    MBC_ENV?: string;
    NODE_ENV?: string;
    DATABASE_URL?: string;
  } = process.env,
): string | null {
  if (env.SEED_FIXTURE_DATA !== "true") return null;
  if (env.MBC_ENV === "production" || env.MBC_ENV === "demo") {
    return "Les données fictives sont interdites sur une instance publique.";
  }
  if (env.NODE_ENV === "production") {
    return "Les données fictives sont interdites lorsque NODE_ENV=production.";
  }
  if ((env.DATABASE_URL ?? "").includes("neon.tech")) {
    return "Les données fictives sont interdites sur une base Neon.";
  }
  return null;
}

export function assertFixtureDataAllowed(): void {
  const reason = fixtureDataBlockReason();
  if (reason) throw new Error(reason);
}

export function assertSeedEmail(email: string): string {
  const value = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Adresse e-mail invalide.");
  }
  if (value.endsWith("@mbc.local") || value.endsWith("@exemple.com") || value.endsWith("@example.com")) {
    throw new Error("Cette adresse e-mail d'exemple ou de développement est interdite.");
  }
  return value;
}

export function assertServerEnv(): void {
  requireJwtSecret();
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl) {
    throw new Error("DATABASE_URL manquant.");
  }
  if (process.env.MBC_ENV === "production" && databaseUrl.includes("mbc_dev_password")) {
    throw new Error("Identifiants PostgreSQL de développement interdits en production.");
  }
}

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

const FORBIDDEN_PUBLIC_PASSWORDS = ["Admin1234!", "Cafe1234!", "Moto1234!"];

export function allowDemoAccounts(): boolean {
  if (process.env.MBC_ENV === "production" || process.env.MBC_ENV === "demo" || process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.ALLOW_DEMO_ACCOUNTS !== "false";
}

export function assertPublicAdminPassword(password: string): void {
  if (FORBIDDEN_PUBLIC_PASSWORDS.includes(password)) {
    throw new Error("Ce mot de passe de développement local est interdit sur une URL publique.");
  }
  const normalized = password.trim().toLowerCase();
  if (normalized.includes("change-this") || normalized.includes("remplacer") || normalized.includes("mot-de-passe-long")) {
    throw new Error("Ce mot de passe d'exemple est interdit.");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD trop court (12 caractères minimum).");
  }
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

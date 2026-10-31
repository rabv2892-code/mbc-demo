export function isTechnicalMessage(message: string) {
  return /prisma|TURBOPACK|invocation in|node_modules|Unique constraint failed|Invalid `prisma|\\\\src\\\\|\\\\.next\\\\|postgresql:\/\/|postgres:\/\/|password\s*=|DATABASE_URL|JWT_SECRET|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i.test(
    message,
  );
}

export function clientSafeMessage(message: string, fallback: string) {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 240 || isTechnicalMessage(trimmed)) return fallback;
  return trimmed;
}

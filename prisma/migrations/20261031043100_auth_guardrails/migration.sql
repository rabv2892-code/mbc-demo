-- CreateTable
CREATE TABLE "LoginThrottle" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginThrottle_bucket_key" ON "LoginThrottle"("bucket");
CREATE INDEX "LoginThrottle_lockedUntil_idx" ON "LoginThrottle"("lockedUntil");

-- Dernier SUPER_ADMIN actif : verrou transactionnel partagé avec l'application.
CREATE OR REPLACE FUNCTION "mbc_prevent_last_super_admin"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  remaining integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mbc:last-super-admin')::bigint);

  IF TG_OP = 'DELETE' THEN
    IF OLD."role" = 'SUPER_ADMIN' AND OLD."isActive" = true THEN
      SELECT COUNT(*) INTO remaining
      FROM "User"
      WHERE "role" = 'SUPER_ADMIN' AND "isActive" = true AND "id" <> OLD."id";
      IF remaining < 1 THEN
        RAISE EXCEPTION 'LAST_SUPER_ADMIN' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."role" = 'SUPER_ADMIN'
       AND OLD."isActive" = true
       AND (NEW."role" IS DISTINCT FROM 'SUPER_ADMIN' OR NEW."isActive" = false) THEN
      SELECT COUNT(*) INTO remaining
      FROM "User"
      WHERE "role" = 'SUPER_ADMIN' AND "isActive" = true AND "id" <> OLD."id";
      IF remaining < 1 THEN
        RAISE EXCEPTION 'LAST_SUPER_ADMIN' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER "User_last_super_admin"
BEFORE UPDATE OR DELETE ON "User"
FOR EACH ROW
EXECUTE FUNCTION "mbc_prevent_last_super_admin"();

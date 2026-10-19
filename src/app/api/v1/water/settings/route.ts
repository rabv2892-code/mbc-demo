import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { getWaterSettings, updateWaterSettings, waterSettingsSchema } from "@/server/water/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.water.access, async () => json(serialize(await getWaterSettings())));
}

export async function PATCH(request: Request) {
  return withAuth(PERMISSIONS.settings.access, async (user) => {
    const body = waterSettingsSchema.parse(await request.json());
    return json(serialize(await updateWaterSettings(user.sub, body)));
  });
}

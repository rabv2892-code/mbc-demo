import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { businessSettingsSchema, getBusinessSettings, updateBusinessSettings } from "@/server/transport/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.settings.access, async () => json(serialize(await getBusinessSettings())));
}

export async function PATCH(request: Request) {
  return withAuth(PERMISSIONS.settings.access, async (user) => {
    const body = businessSettingsSchema.parse(await request.json());
    return json(serialize(await updateBusinessSettings(user.sub, body)));
  });
}

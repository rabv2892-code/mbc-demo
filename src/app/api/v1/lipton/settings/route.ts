import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { getLiptonSettings, updateLiptonSettings, liptonSettingsSchema } from "@/server/lipton/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.lipton.access, async () => json(serialize(await getLiptonSettings())));
}

export async function PATCH(request: Request) {
  return withAuth(["SUPER_ADMIN"], async (user) => {
    const body = liptonSettingsSchema.parse(await request.json());
    return json(serialize(await updateLiptonSettings(user.sub, body)));
  });
}

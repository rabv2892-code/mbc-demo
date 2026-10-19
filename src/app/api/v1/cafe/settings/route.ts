import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { coffeeSettingsSchema, getCoffeeSettings, updateCoffeeSettings } from "@/server/cafe/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.cafe.access, async () => json(serialize(await getCoffeeSettings())));
}

export async function PATCH(request: Request) {
  return withAuth(PERMISSIONS.settings.access, async (user) => {
    const body = coffeeSettingsSchema.parse(await request.json());
    return json(serialize(await updateCoffeeSettings(user.sub, body)));
  });
}

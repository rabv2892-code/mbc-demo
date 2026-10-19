import { AuthError } from "@/server/auth/session";
import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createDelivery, deliverySchema, getRiderByUserId, listDeliveries } from "@/server/transport/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.transport.ownDeliveries, async (user) => {
    if (user.role === "SUPER_ADMIN") {
      return json(serialize(await listDeliveries(parseListFilters(new URL(request.url)))));
    }
    const rider = await getRiderByUserId(user.sub);
    if (!rider) {
      return json([]);
    }
    return json(serialize(await listDeliveries({ ...parseListFilters(new URL(request.url)), riderId: rider.id })));
  });
}

export async function POST(request: Request) {
  return withAuth(["MOTARD", "SUPER_ADMIN"], async (user) => {
    const raw = await request.json();
    const body = deliverySchema.parse(raw);
    let riderId: string | undefined;
    if (user.role === "MOTARD") {
      const rider = await getRiderByUserId(user.sub);
      if (!rider) throw new AuthError("Aucun profil motard associé", 403);
      riderId = rider.id;
    } else {
      riderId = raw.riderId;
      if (!riderId) throw new Error("riderId requis pour le Super Admin");
    }
    return json(serialize(await createDelivery(user.sub, body, riderId)), 201);
  });
}

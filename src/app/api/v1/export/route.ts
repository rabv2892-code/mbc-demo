import { NextResponse } from "next/server";
import { withAuth } from "@/server/api";
import { parseListFilters } from "@/server/query";
import { listCoffeePurchases, listCoffeeSales } from "@/server/cafe/service";
import { listWaterPurchases, listWaterSales } from "@/server/water/service";
import { listLiptonPurchases, listLiptonSales } from "@/server/lipton/service";
import { listDeliveries } from "@/server/transport/service";
import { buildWorkbook, toCsv, type ExportRow } from "@/server/export/workbook";

const MODULES = [
  "coffee-sales",
  "coffee-purchases",
  "water-sales",
  "water-purchases",
  "lipton-sales",
  "lipton-purchases",
  "deliveries",
] as const;

export async function GET(request: Request) {
  return withAuth(["SUPER_ADMIN", "ADMIN_CAFE"], async (user) => {
    const url = new URL(request.url);
    const moduleName = url.searchParams.get("module") as (typeof MODULES)[number];
    const format = url.searchParams.get("format") || "xlsx";
    if (!MODULES.includes(moduleName)) {
      return NextResponse.json({ error: "Module d'export inconnu" }, { status: 400 });
    }
    if ((moduleName === "deliveries" || moduleName.includes("purchases")) && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const filters = parseListFilters(url);
    const { rows, filename } = await collect(moduleName, filters);
    if (format === "csv") {
      return new NextResponse(toCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }
    const buffer = buildWorkbook(rows, filename);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  });
}

async function collect(module: (typeof MODULES)[number], filters: ReturnType<typeof parseListFilters>) {
  if (module === "coffee-sales") {
    const data = await listCoffeeSales(filters);
    return {
      filename: "ventes-cafe",
      rows: data.map((r) => ({
        Date: r.occurredAt.toISOString(),
        Quantité: r.quantity,
        "Prix unitaire": r.unitPrice.toString(),
        Total: r.totalAmount.toString(),
        Coût: r.costAmount.toString(),
        Bénéfice: r.profitAmount.toString(),
        Employé: r.employee.fullName,
      })) satisfies ExportRow[],
    };
  }
  if (module === "coffee-purchases") {
    const data = await listCoffeePurchases(filters);
    return {
      filename: "achats-cafe",
      rows: data.map((r) => ({
        Date: r.occurredAt.toISOString(),
        "Quantité kg": r.qtyKg.toString(),
        "Prix total": r.totalPrice.toString(),
        "Prix/kg": r.pricePerKg.toString(),
        Référence: r.reference ?? "",
        Employé: r.employee.fullName,
      })),
    };
  }
  if (module === "water-sales") {
    const data = await listWaterSales(filters);
    return {
      filename: "ventes-eau",
      rows: data.map((r) => ({
        Date: r.occurredAt.toISOString(),
        Quantité: r.quantity,
        "Prix unitaire": r.unitPrice.toString(),
        Total: r.totalAmount.toString(),
        Employé: r.employee.fullName,
      })),
    };
  }
  if (module === "water-purchases") {
    const data = await listWaterPurchases(filters);
    return {
      filename: "achats-eau",
      rows: data.map((r) => ({
        Date: r.occurredAt.toISOString(),
        Paquets: r.packCount,
        "Sachets / paquet": r.sachetsPerPack,
        "Total sachets": r.quantity,
        "Prix total": r.totalPrice.toString(),
        "Coût moyen": r.avgUnitCost.toString(),
        Fournisseur: r.supplier ?? "",
        Employé: r.employee.fullName,
      })),
    };
  }
  if (module === "lipton-sales") {
    const data = await listLiptonSales(filters);
    return {
      filename: "ventes-lipton",
      rows: data.map((r) => ({
        Date: r.occurredAt.toISOString(),
        Quantité: r.quantity,
        "Prix unitaire": r.unitPrice.toString(),
        Total: r.totalAmount.toString(),
        Employé: r.employee.fullName,
      })),
    };
  }
  if (module === "lipton-purchases") {
    const data = await listLiptonPurchases(filters);
    return {
      filename: "achats-lipton",
      rows: data.map((r) => ({
        Date: r.occurredAt.toISOString(),
        Paquets: r.packCount,
        "Pièces / paquet": r.piecesPerPack,
        "Total pièces": r.quantity,
        "Prix total": r.totalPrice.toString(),
        "Coût moyen": r.avgUnitCost.toString(),
        Fournisseur: r.supplier ?? "",
        Employé: r.employee.fullName,
      })),
    };
  }
  const data = await listDeliveries(filters);
  return {
    filename: "livraisons",
    rows: data.map((r) => ({
      Date: r.occurredAt.toISOString(),
      Client: r.client,
      Départ: r.origin,
      Destination: r.destination,
      Montant: r.amount.toString(),
      Amortissement: r.amortization?.amount.toString() ?? "0",
      Motard: r.rider.fullName,
    })),
  };
}

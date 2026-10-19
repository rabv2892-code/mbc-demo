"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { formatGnf } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/timezone";

type Kind = "cigarette" | "juice";

type Product = {
  id: string;
  name: string;
  piecesPerPack: number;
  packPurchasePrice: string;
  packSalePrice: string;
  pieceSalePrice: string;
  isActive: boolean;
};

const LABELS = {
  cigarette: {
    title: "Cigarettes",
    type: "type de cigarette",
    piece: "cigarette",
    pack: "paquet",
  },
  juice: {
    title: "Jus",
    type: "type de jus",
    piece: "bouteille",
    pack: "paquet",
  },
};

export function RetailTypesPage({ kind }: { kind: Kind }) {
  const L = LABELS[kind];
  const empty = {
    name: "",
    piecesPerPack: kind === "cigarette" ? "20" : "6",
    packPurchasePrice: "",
    packSalePrice: "",
    pieceSalePrice: "",
  };
  const [form, setForm] = useState(empty);
  const [rows, setRows] = useState<Product[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRows(await api<Product[]>(`/api/v1/retail/${kind}/products`));
  }, [kind]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    const name = form.name.trim();
    const packSalePrice = Number(form.packSalePrice);
    const pieceSalePrice = Number(form.pieceSalePrice);
    const packPurchasePrice = Number(form.packPurchasePrice || 0);
    if (!name) {
      setError("Indiquez le nom du type.");
      return;
    }
    if (!packSalePrice || !pieceSalePrice) {
      setError("Indiquez le prix de vente du paquet et le prix de vente au détail.");
      return;
    }
    const payload = {
      name,
      piecesPerPack: Number(form.piecesPerPack),
      packPurchasePrice,
      packSalePrice,
      pieceSalePrice,
    };
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/v1/retail/${kind}/products/${editing}`, { method: "PATCH", body: JSON.stringify(payload) });
        setOk("Type mis à jour");
      } else {
        await api(`/api/v1/retail/${kind}/products`, { method: "POST", body: JSON.stringify(payload) });
        setOk("Type ajouté");
      }
      setForm({ ...empty });
      setEditing(null);
      await load();
    } catch (err) {
      setOk("");
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Product>[] = [
    { key: "name", header: "Type", render: (r) => r.name },
    { key: "pack", header: `${L.piece}s / ${L.pack}`, render: (r) => r.piecesPerPack },
    { key: "buy", header: "Achat paquet", render: (r) => formatGnf(r.packPurchasePrice) },
    { key: "packSale", header: "Vente paquet", render: (r) => formatGnf(r.packSalePrice) },
    { key: "pieceSale", header: "Vente détail", render: (r) => formatGnf(r.pieceSalePrice) },
    {
      key: "act",
      header: "",
      render: (r) => (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setEditing(r.id);
            setForm({
              name: r.name,
              piecesPerPack: String(r.piecesPerPack),
              packPurchasePrice: String(Number(r.packPurchasePrice)),
              packSalePrice: String(Number(r.packSalePrice)),
              pieceSalePrice: String(Number(r.pieceSalePrice)),
            });
          }}
        >
          Modifier
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Types de ${L.title.toLowerCase()}`}
        subtitle="L'administrateur ajoute chaque type, le prix d'achat du paquet, le prix de vente au paquet et au détail."
      />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-xl">{editing ? "Modifier" : `Nouveau ${L.type}`}</h2>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Field label="Nom">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label={`Nombre de ${L.piece}s par ${L.pack}`}>
              <Input type="number" min={1} value={form.piecesPerPack} onChange={(e) => setForm({ ...form, piecesPerPack: e.target.value })} required />
            </Field>
            <Field label={`Prix d'achat d'un ${L.pack} (GNF)`}>
              <Input type="number" min={0} value={form.packPurchasePrice} onChange={(e) => setForm({ ...form, packPurchasePrice: e.target.value })} required />
            </Field>
            <Field label={`Prix de vente d'un ${L.pack} (GNF)`}>
              <Input type="number" min={1} value={form.packSalePrice} onChange={(e) => setForm({ ...form, packSalePrice: e.target.value })} required />
            </Field>
            <Field label="Prix de vente au détail (GNF)">
              <Input type="number" min={1} value={form.pieceSalePrice} onChange={(e) => setForm({ ...form, pieceSalePrice: e.target.value })} required />
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter"}
            </Button>
          </form>
        </Card>
        <DataTable rows={rows} columns={columns} searchKeys={[(r) => r.name]} />
      </div>
    </div>
  );
}

export function RetailPurchasesPage({ kind }: { kind: Kind }) {
  const L = LABELS[kind];
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [packCount, setPackCount] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [rows, setRows] = useState<Array<{
    id: string;
    packCount: number;
    piecesPerPack: number;
    quantity: number;
    totalPrice: string;
    occurredAt: string;
    product: { name: string };
    employee: { fullName: string };
  }>>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async (params = "") => {
    setRows(await api(`/api/v1/retail/${kind}/purchases${params}`));
  }, [kind]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    api<Product[]>(`/api/v1/retail/${kind}/products`).then((list) => {
      setProducts(list);
      if (list[0]) setProductId(list[0].id);
    }).catch(() => undefined);
  }, [kind, load]);

  const product = products.find((p) => p.id === productId);
  const pieces = product ? Number(packCount) * product.piecesPerPack : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!productId) {
      setError("Ajoutez d'abord un type, puis choisissez-le ici.");
      return;
    }
    if (!Number(totalPrice)) {
      setError("Indiquez le prix total payé pour les paquets.");
      return;
    }
    try {
      await api(`/api/v1/retail/${kind}/purchases`, {
        method: "POST",
        body: JSON.stringify({ productId, packCount: Number(packCount), totalPrice: Number(totalPrice), supplier }),
      });
      setOk("Achat enregistré");
      await load();
    } catch (err) {
      setOk("");
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={`Achats ${L.title.toLowerCase()}`} subtitle={`Saisissez le nombre de ${L.pack}s et le prix total payé.`} />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Type">
              <Select value={productId} onChange={(e) => setProductId(e.target.value)} required>
                <option value="">Choisir</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label={`Nombre de ${L.pack}s`}>
              <Input type="number" min={1} value={packCount} onChange={(e) => setPackCount(e.target.value)} required />
            </Field>
            <Field label="Prix total payé (GNF)">
              <Input type="number" min={1} value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} required />
            </Field>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">Total pièces : <strong>{pieces || "—"}</strong></div>
            <Field label="Fournisseur (facultatif)"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full">Enregistrer l&apos;achat</Button>
          </form>
        </Card>
        <DataTable
          rows={rows}
          columns={[
            { key: "date", header: "Date", render: (r) => `${formatDate(r.occurredAt)} ${formatTime(r.occurredAt)}` },
            { key: "type", header: "Type", render: (r) => r.product.name },
            { key: "packs", header: "Paquets", render: (r) => r.packCount },
            { key: "qty", header: "Pièces", render: (r) => r.quantity },
            { key: "total", header: "Prix", render: (r) => formatGnf(r.totalPrice) },
            { key: "user", header: "Employé", render: (r) => r.employee.fullName },
          ]}
          searchKeys={[(r) => r.product.name, (r) => r.employee.fullName]}
          onFilterChange={(f) => {
            const qs = new URLSearchParams();
            if (f.q) qs.set("q", f.q);
            if (f.from) qs.set("from", f.from);
            if (f.to) qs.set("to", f.to);
            load(`?${qs}`).catch((e) => setError(e.message));
          }}
        />
      </div>
    </div>
  );
}

export function RetailSalesPage({ kind }: { kind: Kind }) {
  const L = LABELS[kind];
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [unit, setUnit] = useState<"PACK" | "PIECE">("PIECE");
  const [quantity, setQuantity] = useState("1");
  const [preview, setPreview] = useState<{ unitPrice: string; totalAmount: string; stockCurrent: number; pieceQuantity: number } | null>(null);
  const [rows, setRows] = useState<Array<{
    id: string;
    unit: string;
    quantity: number;
    pieceQuantity: number;
    unitPrice: string;
    totalAmount: string;
    occurredAt: string;
    product: { name: string };
    employee: { fullName: string };
  }>>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async (params = "") => {
    setRows(await api(`/api/v1/retail/${kind}/sales${params}`));
  }, [kind]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    api<Product[]>(`/api/v1/retail/${kind}/products`).then((list) => {
      const active = list.filter((p) => p.isActive);
      setProducts(active);
      if (active[0]) setProductId(active[0].id);
    }).catch(() => undefined);
  }, [kind, load]);

  useEffect(() => {
    if (!productId || !Number(quantity)) return;
    api<{ unitPrice: string; totalAmount: string; stockCurrent: number; pieceQuantity: number }>(
      `/api/v1/retail/${kind}/sales?preview=1&productId=${productId}&unit=${unit}&quantity=${quantity}`,
    ).then(setPreview).catch(() => setPreview(null));
  }, [kind, productId, unit, quantity]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!productId) {
      setError("Ajoutez d'abord un type, puis choisissez-le ici.");
      return;
    }
    try {
      const sale = await api<{ quantity: number; totalAmount: string }>(`/api/v1/retail/${kind}/sales`, {
        method: "POST",
        body: JSON.stringify({ productId, unit, quantity: Number(quantity) }),
      });
      setOk(`Vente enregistrée — ${sale.quantity} · ${formatGnf(sale.totalAmount)}`);
      await load();
    } catch (err) {
      setOk("");
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={`Ventes ${L.title.toLowerCase()}`} subtitle="Choisissez le type, paquet ou détail, puis la quantité. Le prix vient des paramètres admin." />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Type">
              <Select value={productId} onChange={(e) => setProductId(e.target.value)} required>
                <option value="">Choisir</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Vente">
              <Select value={unit} onChange={(e) => setUnit(e.target.value as "PACK" | "PIECE")}>
                <option value="PIECE">Au détail</option>
                <option value="PACK">Au paquet</option>
              </Select>
            </Field>
            <Field label="Quantité">
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </Field>
            <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between"><span>Prix</span><strong>{preview ? formatGnf(preview.unitPrice) : "—"}</strong></div>
              <div className="flex justify-between"><span>Total</span><strong>{preview ? formatGnf(preview.totalAmount) : "—"}</strong></div>
              <div className="flex justify-between"><span>Stock (pièces)</span><strong>{preview?.stockCurrent ?? "—"}</strong></div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full" size="lg">Enregistrer</Button>
          </form>
        </Card>
        <DataTable
          rows={rows}
          columns={[
            { key: "date", header: "Date", render: (r) => `${formatDate(r.occurredAt)} ${formatTime(r.occurredAt)}` },
            { key: "type", header: "Type", render: (r) => r.product.name },
            { key: "unit", header: "Mode", render: (r) => (r.unit === "PACK" ? "Paquet" : "Détail") },
            { key: "qty", header: "Qté", render: (r) => r.quantity },
            { key: "total", header: "Total", render: (r) => formatGnf(r.totalAmount) },
            { key: "user", header: "Employé", render: (r) => r.employee.fullName },
          ]}
          searchKeys={[(r) => r.product.name, (r) => r.employee.fullName]}
          onFilterChange={(f) => {
            const qs = new URLSearchParams();
            if (f.q) qs.set("q", f.q);
            if (f.from) qs.set("from", f.from);
            if (f.to) qs.set("to", f.to);
            load(`?${qs}`).catch((e) => setError(e.message));
          }}
        />
      </div>
    </div>
  );
}

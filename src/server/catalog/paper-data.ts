export const PAPER_KEYS = {
  CAFE_1KG: "CAFE_1KG",
  EAU_SACHET: "EAU_SACHET",
  LIPTON_PAQUET_100: "LIPTON_PAQUET_100",
  SUCRE_PAQUET_250: "SUCRE_PAQUET_250",
} as const;

export const PAPER_CAFE = {
  businessKey: PAPER_KEYS.CAFE_1KG,
  name: "Café 1 kg",
  qtyKg: 1,
  purchasePrice: 40_000,
  cupsPerKg: 55,
  cupSalePrice: 2_500,
  waterWithCup: 500,
};

export const PAPER_EAU = {
  businessKey: PAPER_KEYS.EAU_SACHET,
  name: "Eau sachet",
  initialStock: 25,
  sachetSalePrice: 5_000,
};

export const PAPER_LIPTON = {
  businessKey: PAPER_KEYS.LIPTON_PAQUET_100,
  name: "Lipton",
  piecesPerPack: 100,
  pieceSalePrice: 2_000,
};

export const PAPER_SUCRE = {
  businessKey: PAPER_KEYS.SUCRE_PAQUET_250,
  name: "Sucre",
  piecesPerPack: 250,
  piecesPerCoffeeCup: 2,
  piecesPerLiptonCup: 5,
};

export type ImportAction = "insert" | "skip";

export function decideInsert(exists: boolean): ImportAction {
  return exists ? "skip" : "insert";
}

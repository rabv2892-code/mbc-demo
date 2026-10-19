import { z } from "zod";

export const MAX_GNF_AMOUNT = 1_000_000_000;
export const MAX_QTY = 1_000_000;

export const gnfAmountSchema = z.coerce
  .number({ invalid_type_error: "Montant invalide" })
  .finite()
  .positive("Le montant doit être supérieur à 0")
  .max(MAX_GNF_AMOUNT, "Montant trop élevé");

export const gnfAmountOrZeroSchema = z.coerce
  .number({ invalid_type_error: "Montant invalide" })
  .finite()
  .min(0, "Le montant ne peut pas être négatif")
  .max(MAX_GNF_AMOUNT, "Montant trop élevé");

export const positiveIntQtySchema = z.coerce
  .number({ invalid_type_error: "Quantité invalide" })
  .int("La quantité doit être un entier")
  .positive("Indiquez une quantité supérieure à 0")
  .max(MAX_QTY, "Quantité trop élevée");

export const positiveQtySchema = z.coerce
  .number({ invalid_type_error: "Quantité invalide" })
  .finite()
  .positive("Indiquez une quantité supérieure à 0")
  .max(MAX_QTY, "Quantité trop élevée");

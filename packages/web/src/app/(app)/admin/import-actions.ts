"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Client, ClientContact, ClientProduct, DeepManager, Interaction, Product } from "@/lib/types/database";
import { analyzeImport, prepareImportPayload, type ImportReferenceData, type StructuredImportKind } from "@/services/structured-import";

export type StructuredImportResult =
  | { ok: true; importedRows: number; batchId: string }
  | { ok: false; error: string };

export async function executeStructuredImport(
  kind: StructuredImportKind,
  fileName: string,
  csv: string,
): Promise<StructuredImportResult> {
  if (!csv || csv.length > 5_000_000) return { ok: false, error: "O arquivo deve ter até 5 MB." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "gerente") {
    return { ok: false, error: "Apenas administradores ou gerentes podem importar dados." };
  }

  const [clientsResult, productsResult, managersResult, contactsResult, contractsResult, interactionsResult] = await Promise.all([
    supabase.from("clients").select("id,name").returns<Array<Pick<Client, "id" | "name">>>(),
    supabase.from("products").select("id,name,slug").returns<Array<Pick<Product, "id" | "name" | "slug">>>(),
    supabase.from("deep_managers").select("id,name,email").returns<Array<Pick<DeepManager, "id" | "name" | "email">>>(),
    supabase.from("client_contacts").select("id,client_id,name,email").returns<Array<Pick<ClientContact, "id" | "client_id" | "name" | "email">>>(),
    supabase.from("client_products").select("client_id,product_id").returns<Array<Pick<ClientProduct, "client_id" | "product_id">>>(),
    supabase.from("interactions").select("client_id,product_id,topic,occurred_at").returns<Array<Pick<Interaction, "client_id" | "product_id" | "topic" | "occurred_at">>>(),
  ]);
  const queryError = [clientsResult, productsResult, managersResult, contactsResult, contractsResult, interactionsResult].find((result) => result.error)?.error;
  if (queryError) return { ok: false, error: `Não foi possível validar o lote: ${queryError.message}` };

  const references: ImportReferenceData = {
    clients: clientsResult.data ?? [], products: productsResult.data ?? [], managers: managersResult.data ?? [],
    contacts: contactsResult.data ?? [], contracts: contractsResult.data ?? [], interactions: interactionsResult.data ?? [],
  };
  const analysis = analyzeImport(kind, csv, references);
  if (analysis.rows.length > 5000) return { ok: false, error: "O lote deve ter no máximo 5.000 linhas." };
  if (analysis.validRows.length === 0 || analysis.issues.length > 0) {
    return { ok: false, error: "O arquivo mudou ou contém erros. Analise novamente antes de confirmar." };
  }
  const payload = prepareImportPayload(kind, analysis.validRows, references);
  const { data, error } = await supabase.rpc("import_structured_data", {
    p_kind: kind,
    p_file_name: fileName || "importacao.csv",
    p_rows: payload,
  });
  if (error) return { ok: false, error: error.message };
  const result = data as { batch_id: string; imported_rows: number };
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true, importedRows: result.imported_rows, batchId: result.batch_id };
}

"use server";

import { revalidatePath } from "next/cache";

export async function revalidateDashboardCache() {
  revalidatePath("/", "layout");
}

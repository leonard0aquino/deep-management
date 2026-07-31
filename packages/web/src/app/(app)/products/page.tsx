import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getAuthorizedDashboardData } from "@/lib/data";
import { requireAccess } from "@/lib/auth/access-context";
import { PageTopbar } from "@/components/dashboard/executive/page-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityEditDialog } from "@/components/management/entity-edit-dialog";
import { scoreLabel, scoreToneClass } from "@/lib/status";
import { canManageOperations } from "@/lib/auth/access-control";

export default async function ProdutosPage() {
  const [data, context] = await Promise.all([getAuthorizedDashboardData(), requireAccess("operations")]);
  const canManage = canManageOperations(context.role);
  const rows = data.products.map((product) => { const matrix = data.matrix.filter((item) => item.product_id === product.id); return { product, clients: matrix.length, score: matrix.length ? Math.round(matrix.reduce((sum, item) => sum + item.composite_score, 0) / matrix.length) : null }; });
  return <div><PageTopbar title="Produtos" description={`${rows.length} produtos monitorados`} /><div className="p-6 sm:p-8"><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[760px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Slug</th><th className="px-4 py-3 font-medium">Clientes</th><th className="px-4 py-3 font-medium">Score médio</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y">{rows.map(({ product, clients, score }) => <tr key={product.id} className="hover:bg-muted/25"><td className="px-5 py-4"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ backgroundColor: product.color ?? "#2563eb" }} /><span className="font-medium">{product.name}</span></td><td className="px-4 py-4 text-muted-foreground">{product.slug}</td><td className="px-4 py-4">{clients}</td><td className="px-4 py-4">{score == null ? "—" : <><span className={`font-bold ${scoreToneClass(score)}`}>{score}</span><span className={`ml-2 text-xs ${scoreToneClass(score)}`}>{scoreLabel(score)}</span></>}</td><td className="px-4 py-4"><Badge variant={product.active ? "outline" : "secondary"}>{product.active ? "Ativo" : "Inativo"}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button render={<Link href={`/products/${product.id}`} />} nativeButton={false} variant="ghost" size="sm"><ExternalLink /> Ver</Button>{canManage && <EntityEditDialog kind="product" item={product} />}</div></td></tr>)}</tbody></table></div></div></div>;
}

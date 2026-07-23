import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando painel">
      <div className="flex min-h-[62px] items-center justify-between border-b bg-white px-5 sm:px-7">
        <div className="space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-2.5 w-44" /></div>
        <div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-8 rounded-lg" /></div>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-[116px] rounded-xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
        <div className="grid gap-5 xl:grid-cols-2"><Skeleton className="h-96 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>
      </div>
      <span className="sr-only" role="status">Carregando dados do painel.</span>
    </div>
  );
}

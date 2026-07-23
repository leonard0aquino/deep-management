import Image from "next/image";
import { Activity, AlertCircle, BarChart3, ShieldCheck, UsersRound } from "lucide-react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BENEFITS = [
  { icon: BarChart3, text: "Indicadores executivos em uma visão centralizada" },
  { icon: UsersRound, text: "Carteira, produtos e pessoas conectados" },
  { icon: Activity, text: "Atividades e saúde do relacionamento acompanhadas" },
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-svh bg-white lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-14">
        <div className="pointer-events-none absolute -left-40 top-1/3 size-[520px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-52 -top-48 size-[540px] rounded-full border border-white/10" />

        <div className="relative w-fit rounded-xl bg-white px-5 py-3 shadow-sm">
          <Image src="/logo-deep-slogan.png" alt="DEEP — Turn-on Data" width={230} height={67} priority className="h-auto w-[230px]" />
        </div>

        <div className="relative max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">Relationship Intelligence</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Relacionamentos melhores começam com dados claros.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Acompanhe a saúde da carteira, identifique prioridades e mantenha sua equipe alinhada em uma única plataforma.
          </p>
          <ul className="mt-9 space-y-4">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5"><Icon className="size-4 text-blue-300" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">DEEP · Turn-on Data</p>
      </section>

      <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:hidden">
            <Image src="/logo-deep-slogan.png" alt="DEEP — Turn-on Data" width={190} height={55} priority className="h-auto w-[190px]" />
          </div>

          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-blue-700">Bem-vindo de volta</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Acesse sua conta</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use suas credenciais corporativas para entrar na plataforma.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="size-4" />
              <AlertTitle>Não foi possível entrar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form action={login} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-800">E-mail</label>
              <Input id="email" name="email" type="email" required autoComplete="email" autoFocus placeholder="nome@empresa.com.br" className="h-10" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-800">Senha</label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-10" />
            </div>
            <Button type="submit" className="h-10 w-full">Entrar</Button>
          </form>

          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4" />
            Acesso protegido e restrito a usuários autorizados
          </div>
        </div>
      </section>
    </main>
  );
}

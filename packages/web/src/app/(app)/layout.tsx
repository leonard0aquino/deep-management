import { AppSidebar } from "@/components/layout/app-sidebar";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types/database";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const userResult = await supabase.auth.getUser();

  const userId = userResult.data.user?.id;
  const profileResult = userId
    ? await supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle<UserProfile>()
    : null;

  return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar
          userEmail={userResult.data.user?.email ?? ""}
          userName={profileResult?.data?.name ?? null}
          userRole={profileResult?.data?.role ?? "analista"}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1920px]">{children}</div>
        </main>
      </div>
  );
}

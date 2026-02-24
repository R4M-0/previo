// app/page.tsx

import { redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/server/auth";

export default async function RootPage() {
  try {
    await requireAuthUser();
    redirect("/dashboard");
  } catch {
    redirect("/login");
  }
}

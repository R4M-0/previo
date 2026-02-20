// app/page.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RootPage() {
  const store = await cookies();
  const hasSession = Boolean(store.get("previo_session")?.value);
  redirect(hasSession ? "/dashboard" : "/login");
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSubstances } from "@/lib/evidence";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const substances = await getSubstances();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Admin</h1>
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Logga ut
          </button>
        </form>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        Välj en substans för att redigera faktakort och evidens.
      </p>

      <section className="mt-6 space-y-3">
        {substances.map((substance) => (
          <article
            key={substance.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-zinc-900">{substance.name}</h2>
                <p className="text-xs text-zinc-500">{substance.slug}</p>
              </div>
              <Link
                href={`/admin/substances/${substance.slug}`}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Redigera
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

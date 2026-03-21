import Link from "next/link";
import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/admin-auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <Link className="text-sm text-emerald-700 hover:text-emerald-800" href="/">
        ← Till startsidan
      </Link>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900">
        Admininloggning
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Logga in för att redigera faktakort i browsern.
      </p>

      <form
        className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        method="post"
        action="/api/admin/login"
      >
        <label className="block text-sm font-medium text-zinc-700" htmlFor="password">
          Lösenord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-emerald-500"
        />
        {hasError ? (
          <p className="text-sm text-rose-700">Fel lösenord eller saknat ADMIN_PASSWORD.</p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
        >
          Logga in
        </button>
      </form>
    </main>
  );
}

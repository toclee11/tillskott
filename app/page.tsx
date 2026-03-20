import SearchForm from "@/app/components/SearchForm";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col justify-center px-6 py-16 md:px-10 md:py-24">
      <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl lg:text-5xl">
        Evidensdriven kosttillskottsguide
      </h1>
      <p className="mt-3 text-center text-lg text-zinc-600 md:text-xl">
        Sökbar medicinsk fakta med källspårning till Cochrane, SBU och PubMed.
      </p>

      <div className="mt-10">
        <label htmlFor="search-main" className="mb-2 block text-sm font-medium text-zinc-700">
          Sök näringsämne eller kosttillskott
        </label>
        <SearchForm initialQuery="" audience="clinical" id="search-main" />
      </div>
    </main>
  );
}

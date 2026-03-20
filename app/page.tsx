import SearchForm from "@/app/components/SearchForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6 md:p-10">
      <SearchForm initialQuery="" audience="clinical" />
    </main>
  );
}

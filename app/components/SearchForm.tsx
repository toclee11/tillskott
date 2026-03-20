"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Audience = "public" | "clinical";

type Suggestion = { label: string; value: string };

export default function SearchForm({
  initialQuery,
  audience,
}: {
  initialQuery: string;
  audience: Audience;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const audienceValue = audience;

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const canShowSuggestions = useMemo(() => query.trim().length > 0, [query]);

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      const nextQ = query.trim();
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(nextQ)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data: { suggestions: Suggestion[] } = await res.json();
        setSuggestions(data.suggestions ?? []);
        setActiveIndex((idx) => (idx >= 0 ? Math.min(idx, (data.suggestions?.length ?? 0) - 1) : -1));
      } catch {
        // Ignore aborts/network issues; dropdown will simply stay as-is.
      }
    }, 150);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const selectSuggestion = (s: Suggestion) => {
    setQuery(s.value);
    close();
    // Submit with current query after state update.
    window.requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
    });
  };

  return (
    <div className="relative w-full">
      <form ref={formRef} className="flex flex-wrap items-center gap-2" action="/search" method="get">
        <input type="hidden" name="audience" value={audienceValue} />
        <input
          aria-label="Sökterm"
          className="min-w-[260px] flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
          suppressHydrationWarning
          name="q"
          placeholder="t.ex. vitamin d, b12, magnesium, omega-3"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Small delay allows click on suggestion.
            window.setTimeout(() => {
              close();
            }, 120);
          }}
          onKeyDown={(e) => {
            if (!open) return;

            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((idx) => Math.min((idx < 0 ? 0 : idx + 1), suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((idx) => Math.max(idx - 1, 0));
            } else if (e.key === "Enter") {
              if (activeIndex >= 0 && suggestions[activeIndex]) {
                e.preventDefault();
                selectSuggestion(suggestions[activeIndex]);
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
        />
        <button
          className="rounded bg-sky-700 px-4 py-2 text-white hover:bg-sky-800"
          suppressHydrationWarning
          type="submit"
        >
          Sök
        </button>
      </form>

      {open && canShowSuggestions && suggestions.length > 0 ? (
        <ul
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded border border-zinc-200 bg-white text-sm text-zinc-900 shadow-sm"
          role="listbox"
          aria-label="Sökförslag"
        >
          {suggestions.map((s, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li
                key={s.value}
                role="option"
                aria-selected={isActive}
                className={`cursor-pointer px-3 py-2 ${
                  isActive
                    ? "bg-sky-100 text-zinc-900"
                    : "hover:bg-zinc-100"
                }`}
                onMouseDown={(e) => {
                  // Prevent input blur from closing before click.
                  e.preventDefault();
                }}
                onClick={() => selectSuggestion(s)}
              >
                {s.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}


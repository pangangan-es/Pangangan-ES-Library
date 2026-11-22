import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  RotateCcw,
  Sparkles,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { TextField, SelectField, CheckboxField } from "@/components/Fields";
import { LoadingBlock, ErrorState } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/Button";
import {
  StaggerContainer,
  StaggerItem,
  ScrollReveal,
  FloatingElement,
} from "@/components/motion/MotionPrimitives";
import { useAsync } from "@/hooks/useAsync";
import { useDebounced } from "@/hooks/useDebounced";
import { listPublicCategories, searchCatalog } from "@/features/catalog/catalogService";
import { SCHOOL_ADDRESS, SCHOOL_NAME } from "@/components/SchoolBrand";
import { pluralize } from "@/lib/format";
import type { CatalogBook } from "@/types/domain";

const PAGE_SIZE = 12;

function AvailabilityBadge({ book }: { book: CatalogBook }) {
  if (book.available_copies <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
        <AlertCircle className="h-3.5 w-3.5" />
        All copies are out
      </span>
    );
  }

  const isAllAvailable = book.available_copies === book.total_copies;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        isAllAvailable
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      {book.available_copies} of {pluralize(book.total_copies, "copy", "copies")} available
    </span>
  );
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQ = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? "";
  const urlAvailable = searchParams.get("available") === "true";

  const [search, setSearch] = useState(urlQ);
  const [category, setCategory] = useState(urlCategory);
  const [availableOnly, setAvailableOnly] = useState(urlAvailable);
  const [page, setPage] = useState(0);

  const debounced = useDebounced(search);

  // Sync external search params changes (e.g. forward/backward navigation)
  useEffect(() => {
    setSearch(urlQ);
    setCategory(urlCategory);
    setAvailableOnly(urlAvailable);
  }, [urlQ, urlCategory, urlAvailable]);

  useEffect(() => {
    setPage(0);
  }, [debounced, category, availableOnly]);

  const categories = useAsync(() => listPublicCategories(), []);
  const results = useAsync(
    () => searchCatalog({ search: debounced, category, availableOnly, page, pageSize: PAGE_SIZE }),
    [debounced, category, availableOnly, page],
  );

  function handleSearchChange(newSearch: string) {
    setSearch(newSearch);
    const next = new URLSearchParams(searchParams);
    if (newSearch.trim()) next.set("q", newSearch.trim());
    else next.delete("q");
    setSearchParams(next, { replace: true });
  }

  function handleCategoryChange(newCategory: string) {
    setCategory(newCategory);
    const next = new URLSearchParams(searchParams);
    if (newCategory) next.set("category", newCategory);
    else next.delete("category");
    setSearchParams(next, { replace: true });
  }

  function handleAvailableChange(newAvailable: boolean) {
    setAvailableOnly(newAvailable);
    const next = new URLSearchParams(searchParams);
    if (newAvailable) next.set("available", "true");
    else next.delete("available");
    setSearchParams(next, { replace: true });
  }

  function handleResetFilters() {
    setSearch("");
    setCategory("");
    setAvailableOnly(false);
    setSearchParams({}, { replace: true });
  }

  const hasActiveFilters = Boolean(search.trim() || category || availableOnly);

  return (
    <div className="space-y-8 pb-12">
      {/* Friendly Page Header */}
      <ScrollReveal>
        <div className="rounded-3xl border border-[#EAE2D3] bg-gradient-to-r from-navy-900 to-[#182B54] p-6 text-white shadow-storybook sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-300">
              <Sparkles className="h-3.5 w-3.5" />
              School Book Explorer
            </span>
            <span className="text-xs text-white/60">
              {SCHOOL_NAME} • {SCHOOL_ADDRESS}
            </span>
          </div>

          <h1 className="font-display text-3xl font-extrabold sm:text-4xl text-white">
            Library Book Catalog
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80 leading-relaxed font-sans">
            Search our growing collection of storybooks, textbooks, Filipino folk tales, and reference volumes. Live copy availability is updated on every checkout.
          </p>
        </div>
      </ScrollReveal>

      {/* Filter and Search Controls Card */}
      <ScrollReveal delay={0.1}>
        <div className="rounded-3xl border border-[#EAE2D3] bg-white p-5 sm:p-6 shadow-storybook">
          <form
            role="search"
            aria-label="Search the catalog"
            onSubmit={(e) => e.preventDefault()}
            className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end"
          >
            <div>
              <TextField
                label="Search by title, author or ISBN"
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                maxLength={80}
                placeholder="e.g. Si Pagong at si Matsing, Science 4..."
              />
            </div>

            <div>
              <SelectField
                label="Filter by Category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="">All Categories</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 md:pt-0">
              <CheckboxField
                label="Available now"
                checked={availableOnly}
                onChange={(e) => handleAvailableChange(e.target.checked)}
              />

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-paper-100 px-3 py-2 text-xs font-bold text-ink-700 hover:bg-paper-200 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>
      </ScrollReveal>

      {/* Live Results Area */}
      <div aria-live="polite">
        {results.loading && !results.data ? (
          <div className="py-12">
            <LoadingBlock label="Searching books in catalog..." />
          </div>
        ) : null}

        {results.error ? (
          <ErrorState message={results.error} onRetry={results.reload} />
        ) : null}

        {results.data && !results.error ? (
          results.data.rows.length === 0 ? (
            /* Kid-Friendly Playful Empty Search State */
            <ScrollReveal>
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#EAE2D3] bg-white p-8 text-center shadow-storybook sm:p-12">
                <FloatingElement yOffset={8} duration={3}>
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 shadow-inner">
                    <BookOpen className="h-10 w-10 text-gold-600" />
                  </div>
                </FloatingElement>

                <h2 className="mt-6 font-display text-2xl font-bold text-navy-900">
                  Uh-oh! No books found
                </h2>
                <p className="mt-2 max-w-md text-sm text-ink-600 leading-relaxed font-sans">
                  We couldn't find any books matching{" "}
                  {search ? (
                    <span className="font-semibold text-navy-900">"{search}"</span>
                  ) : (
                    "your active filters"
                  )}
                  . Try checking your spelling, choosing a different category, or turning off "Available now".
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {hasActiveFilters && (
                    <Button variant="accent" onClick={handleResetFilters}>
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Reset All Filters
                    </Button>
                  )}
                  <a
                    href="#how-to-borrow"
                    onClick={(e) => {
                      e.preventDefault();
                      handleResetFilters();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-[#EAE2D3] bg-paper-100 px-4 py-2.5 text-sm font-semibold text-navy-900 hover:bg-paper-200 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4 text-sky-600" />
                    Browse All Books
                  </a>
                </div>
              </div>
            </ScrollReveal>
          ) : (
            <>
              {/* Results Count Header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3.5 py-1 text-xs font-bold text-navy-900 border border-navy-100">
                  <BookOpen className="h-3.5 w-3.5 text-navy-700" />
                  {pluralize(results.data.total, "book")} found
                </span>
                {hasActiveFilters && (
                  <span className="text-xs text-ink-500 font-sans">
                    Filtered by {category ? `Category: "${category}"` : ""}
                    {category && search ? " • " : ""}
                    {search ? `Keyword: "${search}"` : ""}
                    {availableOnly ? " • Available copies only" : ""}
                  </span>
                )}
              </div>

              {/* Books Grid with Motion Stagger */}
              <StaggerContainer
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                staggerChildren={0.05}
              >
                {results.data.rows.map((book) => (
                  <StaggerItem key={book.id}>
                    <article className="group relative flex h-full flex-col justify-between rounded-2xl sm:rounded-3xl border border-paper-300 bg-white p-6 shadow-storybook hover:shadow-storybook-hover hover:border-amber-300 transition-colors duration-200">
                      <div>
                        {/* Top Meta Strip */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <AvailabilityBadge book={book} />
                          {book.category && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                              <Tag className="h-3 w-3" />
                              {book.category}
                            </span>
                          )}
                        </div>

                        {/* Title and Author */}
                        <h2 className="font-display text-xl font-bold text-navy-950 group-hover:text-amber-800 transition-colors leading-snug">
                          {book.title}
                        </h2>
                        <p className="mt-1 text-sm font-medium text-ink-600 font-sans">
                          by <span className="text-ink-900 font-semibold">{book.author}</span>
                        </p>

                        {/* Description */}
                        {book.description ? (
                          <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-700 font-sans">
                            {book.description}
                          </p>
                        ) : null}
                      </div>

                      {/* Footer Details: Shelf Location & ISBN */}
                      <div className="mt-5 border-t border-paper-200 pt-4 text-xs text-ink-600 space-y-1.5 font-sans">
                        {book.shelf_location && (
                          <div className="flex items-center gap-1.5 text-ink-700">
                            <MapPin className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                            <span>
                              Shelf: <strong className="font-semibold text-navy-900">{book.shelf_location}</strong>
                            </span>
                          </div>
                        )}
                        {book.isbn && (
                          <div className="text-xs text-ink-500 font-mono">
                            ISBN: {book.isbn}
                          </div>
                        )}
                      </div>
                    </article>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {/* Pagination */}
              <div className="mt-8">
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={results.data.total}
                  onPage={setPage}
                />
              </div>
            </>
          )
        ) : null}
      </div>
    </div>
  );
}

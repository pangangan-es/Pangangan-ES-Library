import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  BookOpen,
  Sparkles,
  Compass,
  Award,
  Calendar,
  Clock,
  Layers,
  ChevronRight,
  ArrowRight,
  Smile,
  Globe2,
  HelpCircle,
  BookMarked,
} from "lucide-react";

import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
  TiltCard,
} from "@/components/motion/MotionPrimitives";
import { HeroBook3D } from "@/components/hero/HeroBook3D";
import { SuggestBookModal } from "@/features/catalog/SuggestBookModal";
import {
  getPublicLibraryStats,
  listPublicCategories,
  listPublicAnnouncements,
  type PublicLibraryStats,
} from "@/features/catalog/catalogService";
import type { PublicCategory, Announcement } from "@/types/domain";

interface CategoryTheme {
  icon: React.ComponentType<{ className?: string }>;
  subtitle: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
  hoverBorder: string;
  titleHover: string;
  accentBg: string;
  spineBg: string;
  badgeBg: string;
}

function getCategoryTheme(name: string): CategoryTheme {
  const lower = name.toLowerCase();

  // 1. Picture Books & Early Readers: Soft Coral
  if (lower.includes("picture") || lower.includes("early") || lower.includes("kinder")) {
    return {
      icon: Smile,
      subtitle: "Kinder – Grade 2 storybooks",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      iconBorder: "border-rose-200",
      hoverBorder: "hover:border-rose-300",
      titleHover: "group-hover:text-rose-700",
      accentBg: "bg-rose-500",
      spineBg: "from-rose-50 to-rose-100",
      badgeBg: "bg-rose-100 text-rose-700",
    };
  }

  // 2. Filipino & Philippine Folktales: Warm Amber
  if (lower.includes("folk") || lower.includes("alamat") || lower.includes("filipino")) {
    return {
      icon: BookOpen,
      subtitle: "Kwentong Pambata at Alamat",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      iconBorder: "border-amber-200",
      hoverBorder: "hover:border-amber-300",
      titleHover: "group-hover:text-amber-700",
      accentBg: "bg-amber-500",
      spineBg: "from-amber-50 to-amber-100",
      badgeBg: "bg-amber-100 text-amber-800",
    };
  }

  // 3. Sinugbuanong Binisaya / Mother Tongue: Bright Sky
  if (lower.includes("bisaya") || lower.includes("mother tongue") || lower.includes("sinugbuanong")) {
    return {
      icon: Globe2,
      subtitle: "Sinugbuanong Binisaya (MTB-MLE)",
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
      iconBorder: "border-sky-200",
      hoverBorder: "hover:border-sky-300",
      titleHover: "group-hover:text-sky-700",
      accentBg: "bg-sky-500",
      spineBg: "from-sky-50 to-sky-100",
      badgeBg: "bg-sky-100 text-sky-800",
    };
  }

  // 4. English Storybooks & Fiction: Indigo
  if (lower.includes("english") || lower.includes("fiction")) {
    return {
      icon: BookMarked,
      subtitle: "English storybooks & fiction",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      iconBorder: "border-indigo-200",
      hoverBorder: "hover:border-indigo-300",
      titleHover: "group-hover:text-indigo-700",
      accentBg: "bg-indigo-500",
      spineBg: "from-indigo-50 to-indigo-100",
      badgeBg: "bg-indigo-100 text-indigo-700",
    };
  }

  // 5. Science, Nature & Environment: Emerald
  if (lower.includes("science") || lower.includes("nature") || lower.includes("environment")) {
    return {
      icon: Sparkles,
      subtitle: "Animals, space, earth & life",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      iconBorder: "border-emerald-200",
      hoverBorder: "hover:border-emerald-300",
      titleHover: "group-hover:text-emerald-700",
      accentBg: "bg-emerald-500",
      spineBg: "from-emerald-50 to-emerald-100",
      badgeBg: "bg-emerald-100 text-emerald-800",
    };
  }

  // 6. Mathematics & Logic Puzzles: Violet
  if (lower.includes("math") || lower.includes("puzzle") || lower.includes("logic")) {
    return {
      icon: HelpCircle,
      subtitle: "Fun numbers & brain teasers",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      iconBorder: "border-violet-200",
      hoverBorder: "hover:border-violet-300",
      titleHover: "group-hover:text-violet-700",
      accentBg: "bg-violet-500",
      spineBg: "from-violet-50 to-violet-100",
      badgeBg: "bg-violet-100 text-violet-700",
    };
  }

  // 7. Araling Panlipunan & Bohol Heritage: Teal
  if (
    lower.includes("heritage") ||
    lower.includes("bohol") ||
    lower.includes("araling") ||
    lower.includes("panlipunan") ||
    lower.includes("history")
  ) {
    return {
      icon: Award,
      subtitle: "Calape, Bohol & Philippine heritage",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      iconBorder: "border-teal-200",
      hoverBorder: "hover:border-teal-300",
      titleHover: "group-hover:text-teal-700",
      accentBg: "bg-teal-500",
      spineBg: "from-teal-50 to-teal-100",
      badgeBg: "bg-teal-100 text-teal-800",
    };
  }

  // 8. Edukasyon sa Pagpapakatao (Values): Pink
  if (lower.includes("values") || lower.includes("pagpapakatao") || lower.includes("edukasyon")) {
    return {
      icon: Smile,
      subtitle: "Moral character & good manners",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
      iconBorder: "border-pink-200",
      hoverBorder: "hover:border-pink-300",
      titleHover: "group-hover:text-pink-700",
      accentBg: "bg-pink-500",
      spineBg: "from-pink-50 to-pink-100",
      badgeBg: "bg-pink-100 text-pink-700",
    };
  }

  // 9. Reference & Dictionaries: Orange
  if (lower.includes("reference") || lower.includes("dictionary") || lower.includes("dictionaries")) {
    return {
      icon: Layers,
      subtitle: "Dictionaries & children atlases",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      iconBorder: "border-orange-200",
      hoverBorder: "hover:border-orange-300",
      titleHover: "group-hover:text-orange-700",
      accentBg: "bg-orange-500",
      spineBg: "from-orange-50 to-orange-100",
      badgeBg: "bg-orange-100 text-orange-800",
    };
  }

  // 10. DepEd Textbooks & Learning Modules: Blue
  if (lower.includes("textbook") || lower.includes("deped") || lower.includes("module")) {
    return {
      icon: BookOpen,
      subtitle: "Official modules & learning activity sheets",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      iconBorder: "border-blue-200",
      hoverBorder: "hover:border-blue-300",
      titleHover: "group-hover:text-blue-700",
      accentBg: "bg-blue-500",
      spineBg: "from-blue-50 to-blue-100",
      badgeBg: "bg-blue-100 text-blue-800",
    };
  }

  // Fallback for custom staff categories
  return {
    icon: BookOpen,
    subtitle: "Learning resources & fiction",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    iconBorder: "border-amber-200",
    hoverBorder: "hover:border-amber-300",
    titleHover: "group-hover:text-amber-700",
    accentBg: "bg-amber-500",
    spineBg: "from-amber-50 to-amber-100",
    badgeBg: "bg-amber-100 text-amber-800",
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [liveCategories, setLiveCategories] = useState<PublicCategory[]>([]);
  const [liveAnnouncements, setLiveAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<PublicLibraryStats>({
    totalBooks: 0,
    availableBooks: 0,
    categoryCount: 0,
    recentBooks: [],
    featuredBook: null,
    settings: {
      operating_hours: "Mon – Fri, 7:30 AM – 4:30 PM",
      quarter_name: "Q2 Reading Adventure",
      quarter_reading_goal_target: 1200,
      quarter_reading_goal_current: 840,
    },
  });

  useEffect(() => {
    void getPublicLibraryStats().then(setStats);
    void listPublicCategories().then(setLiveCategories);
    void listPublicAnnouncements().then(setLiveAnnouncements);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/catalog");
    }
  }

  return (
    <div className="space-y-20 overflow-hidden">
      {/* =========================================================================
          SECTION A: INTERACTIVE HERO SECTION
         ========================================================================= */}
      <section className="relative pt-6 sm:pt-10 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column (Desktop) / Second (Mobile & Tablet Portrait): Headline, Search & Stats */}
            <div className="order-2 lg:order-1 lg:col-span-7 space-y-6 text-center lg:text-left">
              <ScrollReveal delay={0.05}>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-navy-950 leading-[1.14]">
                  Discover Your Next{" "}
                  <span className="text-amber-700">Great Adventure</span>
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.12}>
                <p className="text-base sm:text-lg text-ink-700 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans">
                  Welcome to our school’s library hub. Explore storybooks, science discoveries, and local Philippine fables curated for Pangangan elementary learners.
                </p>
              </ScrollReveal>

              {/* Quick Search Bar */}
              <ScrollReveal delay={0.18}>
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative flex flex-col sm:flex-row items-stretch gap-2 max-w-xl mx-auto lg:mx-0 p-1.5 rounded-2xl bg-white shadow-storybook border border-paper-300 focus-within:border-navy-400 focus-within:ring-2 focus-within:ring-navy-100 transition-all"
                >
                  <div className="relative flex-1 flex items-center pl-3">
                    <Search className="h-5 w-5 text-ink-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search storybooks, authors, topics..."
                      className="w-full bg-transparent px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition-colors active:scale-[0.98]"
                  >
                    <span>Search Books</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </ScrollReveal>

              {/* Live Library Snapshot (Database Categories & Schedule) */}
              <ScrollReveal delay={0.24}>
                <div className="pt-2 grid grid-cols-2 gap-3 max-w-sm mx-auto lg:mx-0">
                  <div className="rounded-2xl border border-paper-300 bg-white p-3.5 shadow-sm text-center">
                    <p className="font-display text-2xl sm:text-3xl font-bold text-navy-900 tabular-nums">
                      <AnimatedCounter target={stats.categoryCount} />
                    </p>
                    <p className="text-xs font-medium text-ink-600 mt-0.5">Book Categories</p>
                  </div>

                  <div className="rounded-2xl border border-paper-300 bg-white p-3.5 shadow-sm text-center">
                    <div className="flex items-center justify-center gap-1.5 text-navy-900">
                      <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                      <p className="font-bold text-xs sm:text-sm truncate">
                        {stats.settings.operating_hours.split(",")[0] || "Mon – Fri"}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-ink-600 mt-1">Open for Readers</p>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Column (Desktop & Tablet Landscape) / Top (Mobile & Tablet Portrait): Interactive 3D Magical Storybook Scene */}
            <div className="order-1 lg:order-2 lg:col-span-5 relative flex items-center justify-center">
              <ScrollReveal delay={0.1} className="w-full">
                <HeroBook3D spotlightBook={stats.featuredBook} />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION B: BROWSE BY GRADE LEVEL & TOPIC (LIVE DATABASE CATEGORIES)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-600 bg-sky-100 px-3 py-1 rounded-full">
              Explore by Topic
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-navy-900 mt-2">
              Browse What You Love
            </h2>
            <p className="text-sm text-ink-600 mt-1">
              Tap any category card to instantly see matching storybooks and learning materials!
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Live categories mapped from database */}
          {liveCategories.map((cat) => {
            const theme = getCategoryTheme(cat.name);
            const Icon = theme.icon;

            return (
              <StaggerItem key={cat.id}>
                <Link
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 rounded-2xl sm:rounded-3xl"
                >
                  <article className={`flex flex-col justify-between h-full rounded-2xl sm:rounded-3xl border border-paper-300 bg-white p-3.5 sm:p-5 shadow-storybook hover:shadow-storybook-hover ${theme.hoverBorder} transition-all duration-200`}>
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl border ${theme.iconBorder} ${theme.iconBg} ${theme.iconColor} group-hover:scale-105 transition-all shrink-0`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-navy-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>

                    <div>
                      <h3 className={`font-sans font-bold text-sm sm:text-base text-navy-900 ${theme.titleHover} transition-colors line-clamp-2 leading-snug tracking-tight`}>
                        {cat.name}
                      </h3>
                      <p className="text-xs text-ink-500 mt-1 line-clamp-2 leading-tight font-sans">
                        {theme.subtitle}
                      </p>
                    </div>
                  </article>
                </Link>
              </StaggerItem>
            );
          })}

          {/* Special Full-Width Banner: All Available Books (Eliminates orphan cards on all viewports) */}
          <StaggerItem className="col-span-full">
            <Link
              to="/catalog?available=true"
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 rounded-2xl sm:rounded-3xl"
            >
              <article className="rounded-2xl sm:rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50/90 via-amber-100/40 to-amber-50/80 p-4 sm:p-5 shadow-storybook hover:shadow-storybook-hover hover:border-amber-400 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-amber-300 bg-amber-100 text-amber-900 group-hover:scale-105 transition-transform">
                    <Compass className="h-6 w-6 text-amber-800" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-base sm:text-lg text-navy-900 group-hover:text-amber-800 transition-colors tracking-tight">
                      All Available Books
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-600 font-sans mt-0.5">
                      Looking for something ready to take home today? Browse every title currently on the shelf!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-navy-950 shadow-sm transition-colors">
                  <span>Explore All Available</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </article>
            </Link>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* =========================================================================
          SECTION C: LIBRARIAN'S PICK & NEW ARRIVALS (LIVE SUPABASE DATA)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Spotlight Card: Librarian's Pick of the Week */}
          <div className="lg:col-span-5">
            <ScrollReveal className="h-full">
              {stats.featuredBook ? (
                <article className="relative h-full flex flex-col justify-between rounded-3xl bg-white border border-paper-300 p-6 sm:p-8 shadow-storybook hover:shadow-storybook-hover hover:border-amber-300 transition-all duration-200">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-200">
                        Librarian's Choice
                      </span>
                      <span className="text-xs font-medium text-ink-500 font-sans">
                        {stats.featuredBook.category || "Recommended Story"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-sans font-bold text-xl sm:text-2xl text-navy-950 mt-1 leading-snug tracking-tight">
                        {stats.featuredBook.title}
                      </h3>
                      <p className="text-sm font-medium text-slate-600 mt-1 font-sans">By {stats.featuredBook.author}</p>

                      <div className="my-6 rounded-2xl bg-paper-100/80 p-4 border border-paper-200">
                        <p className="text-sm text-ink-700 leading-relaxed font-sans">
                          "{stats.featuredBook.description || "A wonderful storybook specially selected by our library teachers to inspire imagination and joy in reading."}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-paper-200">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-2.5 w-2.5 rounded-full ${
                          stats.featuredBook.available_copies > 0 ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <span className="text-xs font-semibold text-navy-900 font-sans">
                        {stats.featuredBook.available_copies > 0
                          ? `${stats.featuredBook.available_copies} Available to Borrow`
                          : "Currently on Loan"}
                      </span>
                    </div>
                    <Link
                      to={`/catalog?q=${encodeURIComponent(stats.featuredBook.title)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 shadow-sm transition-colors"
                    >
                      <span>Check Book</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ) : (
                /* Friendly Honest Empty State when catalog is clear */
                <div className="relative h-full flex flex-col items-center justify-center text-center rounded-3xl bg-paper-100 border border-dashed border-paper-300 p-8 shadow-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 mb-4">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-navy-900">
                    Cataloging in progress
                  </h3>
                  <p className="text-xs text-ink-600 mt-1 max-w-xs font-sans">
                    New titles are currently being cataloged by our school librarian. Check back soon for the weekly featured book!
                  </p>
                </div>
              )}
            </ScrollReveal>
          </div>

          {/* New Arrivals Shelf */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                    Just Landed
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-navy-900 mt-2">
                    New Arrivals Shelf
                  </h2>
                </div>
                <Link
                  to="/catalog"
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                >
                  <span>View full catalog</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {stats.recentBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stats.recentBooks.slice(0, 6).map((book) => {
                    const theme = getCategoryTheme(book.category || "");
                    return (
                      <TiltCard key={book.id}>
                        <article className="h-full flex gap-3.5 sm:gap-4 rounded-2xl border border-paper-300 bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-storybook-hover hover:border-paper-400 transition-all">
                          {/* Mini Book Cover / Spine Visual */}
                          <div className="shrink-0 w-16 sm:w-20 self-stretch rounded-xl overflow-hidden border border-paper-300 bg-paper-100 flex flex-col items-center justify-center relative shadow-inner">
                            {book.cover_url ? (
                              <img
                                src={book.cover_url}
                                alt={book.title}
                                className="w-full h-full object-cover rounded-lg"
                                loading="lazy"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${theme.spineBg} flex flex-col items-center justify-between p-2 text-center`}>
                                <div className={`w-full h-1.5 rounded-full ${theme.accentBg}`} />
                                <BookOpen className={`h-6 w-6 ${theme.iconColor} opacity-80`} />
                                <span className="text-[9px] font-bold text-ink-500 uppercase tracking-wider truncate max-w-[56px]">
                                  {book.category?.split(" ")[0] || "Story"}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Book Details */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              {/* Category & Availability Badges */}
                              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-tight ${theme.badgeBg}`}>
                                  {book.category || "Storybook"}
                                </span>
                                {book.available_copies && book.available_copies > 0 ? (
                                  <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                    {book.available_copies} available
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                    On Loan
                                  </span>
                                )}
                              </div>

                              {/* Book Card Title: clean font-sans font-bold text-sm sm:text-base */}
                              <h4 className="font-sans font-bold text-sm sm:text-base text-navy-950 line-clamp-1 leading-snug tracking-tight">
                                {book.title}
                              </h4>
                              {/* Author Name: text-sm, darkened to text-slate-600 */}
                              <p className="text-sm font-medium text-slate-600 mt-0.5 line-clamp-1 font-sans">
                                {book.author}
                              </p>
                            </div>

                            {/* Bottom row: school tag & Details link */}
                            <div className="mt-3 pt-2.5 border-t border-paper-200 flex items-center justify-between">
                              <span className="text-xs text-slate-500 font-sans">Pangangan ES</span>
                              <Link
                                to={`/catalog?q=${encodeURIComponent(book.title || "")}`}
                                className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-0.5"
                              >
                                <span>Details</span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        </article>
                      </TiltCard>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-paper-300 bg-white p-8 text-center shadow-sm">
                  <p className="font-display text-base font-bold text-navy-900">
                    No books on shelf yet
                  </p>
                  <p className="text-xs text-ink-500 mt-1">
                    Books added by the library staff will automatically appear here on the New Arrivals shelf.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION E: LIBRARY BULLETIN & LITERACY EVENTS (LIVE SUPABASE ANNOUNCEMENTS)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-200">
                Announcements
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-950 mt-2">
                Library Bulletin & Literacy Events
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-ink-600 max-w-md font-sans">
              Stay connected with upcoming reading activities, workshops, and book campaigns at Pangangan ES.
            </p>
          </div>
        </ScrollReveal>

        {liveAnnouncements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {liveAnnouncements.map((ann, idx) => (
              <ScrollReveal key={ann.id} delay={0.08 * (idx + 1)}>
                <article className="h-full flex flex-col justify-between rounded-2xl border border-paper-300 bg-white p-6 shadow-storybook hover:shadow-storybook-hover hover:border-amber-300 transition-colors">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {ann.badge && (
                        <span className="rounded-md border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                          {ann.badge}
                        </span>
                      )}
                      {ann.event_date && (
                        <span className="text-xs text-ink-500 font-medium font-sans">{ann.event_date}</span>
                      )}
                    </div>
                    <h3 className="font-sans font-bold text-base sm:text-lg text-navy-950 leading-snug">{ann.title}</h3>
                    <p className="text-xs text-ink-600 mt-2 leading-relaxed font-sans">{ann.content}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-paper-200 flex items-center justify-between text-xs font-medium text-ink-600 font-sans">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-amber-700" /> Pangangan ES Library
                    </span>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-paper-300 bg-white p-8 text-center shadow-storybook">
            <p className="font-sans font-bold text-base sm:text-lg text-navy-900">
              No bulletin announcements right now
            </p>
            <p className="text-xs text-ink-500 mt-1 font-sans">
              Check back soon for upcoming story hours, reading drives, and school literacy celebrations.
            </p>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION F: HOW TO BORROW & COMMUNITY ACTIONS
         ========================================================================= */}
      <section id="how-to-borrow" className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200">
              Borrowing Guide
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-950 mt-2">
              How to Borrow a Book
            </h2>
            <p className="text-sm text-ink-600 mt-1 font-sans">
              Three simple steps for Pangangan pupils to borrow their next great adventure.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScrollReveal delay={0.08}>
            <article className="relative rounded-2xl border border-paper-300 bg-white p-6 sm:p-7 shadow-storybook text-center">
              <span className="font-display text-3xl font-bold text-amber-700 mb-3 block">
                01
              </span>
              <h3 className="font-sans font-bold text-base sm:text-lg text-navy-950">
                Explore & Choose
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 mt-2 leading-relaxed font-sans">
                Browse our online catalog or walk along the library shelves in Lomboy to find a storybook you love.
              </p>
            </article>
          </ScrollReveal>

          <ScrollReveal delay={0.16}>
            <article className="relative rounded-2xl border border-paper-300 bg-white p-6 sm:p-7 shadow-storybook text-center">
              <span className="font-display text-3xl font-bold text-amber-700 mb-3 block">
                02
              </span>
              <h3 className="font-sans font-bold text-base sm:text-lg text-navy-950">
                Visit the Library Desk
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 mt-2 leading-relaxed font-sans">
                Present the book to our school librarian or teacher-on-duty. They will record your checkout in seconds.
              </p>
            </article>
          </ScrollReveal>

          <ScrollReveal delay={0.24}>
            <article className="relative rounded-2xl border border-paper-300 bg-white p-6 sm:p-7 shadow-storybook text-center">
              <span className="font-display text-3xl font-bold text-amber-700 mb-3 block">
                03
              </span>
              <h3 className="font-sans font-bold text-base sm:text-lg text-navy-950">
                Read, Enjoy & Return
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 mt-2 leading-relaxed font-sans">
                Enjoy reading at home or in the classroom! Return your book on time so other Pangangan learners can read it too.
              </p>
            </article>
          </ScrollReveal>
        </div>

        {/* Community Actions Strip */}
        <ScrollReveal delay={0.3}>
          <div className="mt-10 rounded-2xl bg-white border border-paper-300 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-sans font-bold text-base sm:text-lg text-navy-950">
                Have a book you'd love to see in our library?
              </h4>
              <p className="text-xs sm:text-sm text-ink-600 font-sans">
                Suggest titles for our reading corners or donate children's storybooks to support our learners.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSuggestModalOpen(true)}
              className="rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition-colors active:scale-[0.98] shrink-0"
            >
              Suggest or Donate a Book
            </button>
          </div>
        </ScrollReveal>
      </section>

      {/* Suggest / Donate Book Spring Modal */}
      <SuggestBookModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
      />
    </div>
  );
}

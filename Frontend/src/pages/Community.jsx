import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Mail, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import CommunityTemplateCard from "../components/community/CommunityTemplateCard";
import Seo from "../components/common/Seo";
import Footer from "../landing/Footer";
import { useCommunityTemplates } from "../hooks/useCommunityTemplates";

const templateTypes = [
  { id: "all", label: "All templates" },
  { id: "email", label: "Generated emails" },
  { id: "prompt", label: "Prompt templates" },
];

const CommunitySkeleton = () => (
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="h-[430px] animate-pulse rounded-2xl border border-white/10 bg-surface-800" />
    ))}
  </div>
);

export default function Community() {
  const [activeType, setActiveType] = useState("all");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError, refetch } = useCommunityTemplates();

  const templates = useMemo(() => {
    if (!data) return [];
    return [...data.emailTemplates, ...data.promptTemplates];
  }, [data]);

  const categories = useMemo(
    () => ["All", ...new Set(templates.map((template) => template.category))],
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesType = activeType === "all" || template.type === activeType;
      const matchesCategory = activeCategory === "All" || template.category === activeCategory;
      const searchableText = [
        template.title,
        template.description,
        template.category,
        template.tone,
        ...template.tags,
      ].join(" ").toLowerCase();

      return matchesType && matchesCategory && searchableText.includes(normalizedQuery);
    });
  }, [activeCategory, activeType, searchQuery, templates]);

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <Seo
        title="Community Email & Prompt Templates"
        description="Explore proven cold email examples and reusable AI prompts for sales, job search, networking, partnerships, and more."
        path="/community"
      />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-surface-950/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2 sm:px-3">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="flex items-center cursor-pointer">
              <img src="/white-logo.png" alt="logo" className="h-8 w-8 md:h-10 md:w-10 p-1 rounded" />
                <span className="font-medium text-gray-100 text-xl md:text-2xl">
                  𝐂𝐨𝐥𝐝𝐌𝐚𝐢𝐥𝐞𝐫𝐀𝐈
                </span>
            </div>
          </NavLink>

          <nav className="flex items-center gap-2 sm:gap-5">
            <NavLink to="/" className="hidden text-md text-gray-400 transition hover:text-white sm:block">
              Home
            </NavLink>
            <span className="hidden text-md font-medium text-brand-100 sm:block">Community</span>
            <NavLink
              to="/generate-email"
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium transition hover:bg-brand-600 sm:px-4"
            >
              Generate Email
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-brand opacity-40 blur-[120px]" />
          <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-brand-800 opacity-30 blur-[100px]" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24">
            
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-sm text-brand-100">
              {/* <Sparkles className="h-4 w-4" /> */}
              <img src="/white-logo.png" alt="logo" className="h-7 w-7 p-1 rounded cursor-pointer" />
              Built to help every email perform better
            </div>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
              Start with a template.
              <span className="block bg-gradient-to-r from-brand-100 via-brand-400 to-violet-300 bg-clip-text text-transparent">
                Make it yours.
              </span>
            </h1>
            <p className="mx-auto mt-6 md:max-w-xl text-base leading-7 text-gray-400 sm:text-lg">
              Browse ready-to-use email examples and detailed AI prompts for sales,
              job searches, partnerships, networking, and more.
            </p>

            <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] py-4">
              <div>
                <p className="text-xl font-semibold text-white">{data?.emailTemplates.length ?? "—"}</p>
                <p className="mt-1 text-xs text-gray-500">Emails</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-white">{data?.promptTemplates.length ?? "—"}</p>
                <p className="mt-1 text-xs text-gray-500">Prompts</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-white">{categories.length > 1 ? categories.length - 1 : "—"}</p>
                <p className="mt-1 text-xs text-gray-500">Use cases</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-8 flex flex-col gap-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex overflow-x-auto rounded-xl border border-white/10 bg-surface-800 p-1">
                {templateTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setActiveType(type.id)}
                    className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      activeType === type.id
                        ? "bg-brand text-white shadow-lg"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <label className="relative block w-full lg:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search templates..."
                  className="w-full rounded-xl border border-white/10 bg-surface-800 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
            </div>

            <div className="custom-scroll flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                    activeCategory === category
                      ? "border-brand-400/50 bg-brand-500/15 text-brand-100"
                      : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {isLoading ? "Loading templates..." : `${filteredTemplates.length} templates`}
            </p>
            <div className="hidden items-center gap-4 text-xs text-gray-500 sm:flex">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email examples</span>
              <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Reusable prompts</span>
            </div>
          </div>

          {isLoading && <CommunitySkeleton />}

          {isError && (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-6 py-16 text-center">
              <p className="text-lg font-medium">Templates could not be loaded.</p>
              <p className="mt-2 text-sm text-gray-400">Please check your connection and try again.</p>
              <button type="button" onClick={() => refetch()} className="mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium hover:bg-brand-600">
                Try again
              </button>
            </div>
          )}

          {!isLoading && !isError && filteredTemplates.length > 0 && (
            <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <CommunityTemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}

          {!isLoading && !isError && filteredTemplates.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-surface-800 px-6 py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-gray-600" />
              <p className="mt-4 text-lg font-medium">No matching templates</p>
              <p className="mt-2 text-sm text-gray-500">Try another search term or category.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All");
                  setActiveType("all");
                }}
                className="mt-5 text-sm font-medium text-brand-100 hover:text-white"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 sm:pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-brand-400/20 bg-gradient-to-br from-brand-900 to-surface-800 px-6 py-12 text-center sm:px-12">
            <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-brand opacity-20 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl font-bold sm:text-3xl">Found the right starting point?</h2>
              <p className="mx-auto mt-3 max-w-xl text-gray-300">
                Copy a template, add your context, and let ColdMailerAI turn it into a personalized email.
              </p>
              <NavLink
                to="/generate-email"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-gray-100"
              >
                Generate your email
                <ArrowRight className="h-4 w-4" />
              </NavLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

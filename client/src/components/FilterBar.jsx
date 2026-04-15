import { Search, SlidersHorizontal, X } from "lucide-react";

const STATUS_OPTIONS = ["TASK", "IN PROGRESS", "REVIEW", "COMPLETED"];

export default function FilterBar({
  search,
  setSearch,
  status,
  setStatus,
  member,
  setMember,
  memberOptions = [],
  resultCount = 0,
  totalCount = 0,
  searchLoading = false,
  onClear,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks by title, assignee, or description"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Filters</span>
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="">All status</option>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            {memberOptions.length > 0 ? (
              <select
                value={member}
                onChange={(event) => setMember(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">All members</option>
                {memberOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={member}
                onChange={(event) => setMember(event.target.value)}
                placeholder="Filter by member"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{resultCount}</span> of {totalCount}
          </p>

          {searchLoading && (
            <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">
              Searching...
            </span>
          )}

          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}

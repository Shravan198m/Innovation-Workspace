import { Search, SlidersHorizontal, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

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
    <section className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks by title, assignee, or description"
              className="glass-input w-full rounded-xl py-3 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="glass-surface inline-flex items-center gap-2 rounded-xl px-3 py-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Filters</span>
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="glass-input min-w-[10rem] rounded-xl px-3 py-3 text-sm"
            >
              <option value="">All status</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {memberOptions.length > 0 ? (
              <select
                value={member}
                onChange={(event) => setMember(event.target.value)}
                className="glass-input min-w-[12rem] rounded-xl px-3 py-3 text-sm"
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
                className="glass-input min-w-[12rem] rounded-xl px-3 py-3 text-sm"
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
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
            className="glass-button-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { X } from "lucide-react";

type Props = {
  leagues: { id: string; name: string }[];
  filters: { dateFrom?: string; dateTo?: string; leagueId?: string };
  onChange: (f: { dateFrom?: string; dateTo?: string; leagueId?: string }) => void;
};

export default function BookingFilters({ leagues, filters, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filters</span>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">From</label>
        <input
          type="date"
          className="border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          value={filters.dateFrom ?? ""}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">To</label>
        <input
          type="date"
          className="border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          value={filters.dateTo ?? ""}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">League</label>
        <select
          className="border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          value={filters.leagueId ?? ""}
          onChange={(e) => onChange({ ...filters, leagueId: e.target.value || undefined })}
        >
          <option value="">All leagues</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
      {(filters.dateFrom || filters.dateTo || filters.leagueId) && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}

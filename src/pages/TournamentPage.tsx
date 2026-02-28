import React, { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Trophy } from "lucide-react";
import { useTournaments, useUpsertTournament, useDeleteTournament, TOURNAMENT_TYPES, Tournament } from "@/hooks/useTournaments";
import { Badge } from "@/components/ui/badge";

type FilterType = "ALL" | typeof TOURNAMENT_TYPES[number];

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    MCR: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "ATP/WTA": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "ONE-OFF": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorMap[type] || "bg-muted text-muted-foreground border-border"}`}>
      {type}
    </span>
  );
}

export default function TournamentPage() {
  const { data: tournaments = [] } = useTournaments(false);
  const upsert = useUpsertTournament();
  const del = useDeleteTournament();

  const [filter, setFilter] = useState<FilterType>("ALL");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", type: "ONE-OFF" as string, date_from: "", date_to: "", active: true });

  const filtered = filter === "ALL" ? tournaments : tournaments.filter((t) => t.type === filter);

  const startNew = () => {
    setDraft({ name: "", type: "ONE-OFF", date_from: "", date_to: "", active: true });
    setEditing("new");
  };

  const startEdit = (t: Tournament) => {
    setDraft({
      name: t.name,
      type: t.type,
      date_from: t.date_from ?? "",
      date_to: t.date_to ?? "",
      active: t.active,
    });
    setEditing(t.id);
  };

  const save = () => {
    if (!draft.name.trim()) return;
    upsert.mutate({
      id: editing === "new" ? undefined : editing!,
      name: draft.name,
      type: draft.type,
      date_from: draft.date_from || null,
      date_to: draft.date_to || null,
      active: draft.active,
    });
    setEditing(null);
  };

  const cancel = () => setEditing(null);

  const EditRow = ({ isNew }: { isNew?: boolean }) => (
    <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
      <td className="px-2 py-1">
        <input
          autoFocus
          className="grid-cell-input border border-ring rounded w-full"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Tournament name…"
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        />
      </td>
      <td className="px-2 py-1">
        <select
          className="grid-cell-input border border-border rounded"
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        >
          {TOURNAMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1">
        <input
          type="date"
          className="grid-cell-input border border-border rounded"
          value={draft.date_from}
          onChange={(e) => setDraft({ ...draft, date_from: e.target.value })}
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="date"
          className="grid-cell-input border border-border rounded"
          value={draft.date_to}
          onChange={(e) => setDraft({ ...draft, date_to: e.target.value })}
        />
      </td>
      <td className="px-2 py-1">
        <select
          className="grid-cell-input border border-border rounded"
          value={draft.active ? "1" : "0"}
          onChange={(e) => setDraft({ ...draft, active: e.target.value === "1" })}
        >
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <div className="flex gap-1">
          <button onClick={save} className="text-[hsl(var(--confirmation-yes))] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
          <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Type filter tabs */}
      <div className="flex items-center gap-2">
        {(["ALL", ...TOURNAMENT_TYPES] as FilterType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            <span className="ml-1.5 text-[10px] opacity-70">
              ({t === "ALL" ? tournaments.length : tournaments.filter((x) => x.type === t).length})
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80"
        >
          <Plus className="h-3.5 w-3.5" /> Add Tournament
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-28">Type</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-28">From</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-28">To</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Status</th>
              <th className="px-2 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {editing === "new" && <EditRow isNew />}
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-b-0 group hover:bg-muted/30">
                {editing === t.id ? (
                  <EditRow />
                ) : (
                  <>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2"><TypeBadge type={t.type} /></td>
                    <td className="px-3 py-2 text-muted-foreground">{t.date_from ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{t.date_to ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        t.active ? "bg-[hsl(var(--tag-active))] text-[hsl(var(--tag-active-foreground))]" : "bg-muted text-muted-foreground"
                      }`}>
                        {t.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(t)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                        <button onClick={() => del.mutate(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && editing !== "new" && (
              <tr><td colSpan={6} className="px-3 py-8 text-muted-foreground text-center">No tournaments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

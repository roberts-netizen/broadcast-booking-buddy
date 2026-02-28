import React, { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Trophy, ChevronRight } from "lucide-react";
import { useTournaments, useUpsertTournament, useDeleteTournament, TOURNAMENT_TYPES, Tournament } from "@/hooks/useTournaments";
import TournamentDetail from "@/components/TournamentDetail";

type FilterType = "ALL" | typeof TOURNAMENT_TYPES[number];

function TypeDot({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    MCR: "bg-blue-400",
    "ATP/WTA": "bg-emerald-400",
    "ONE-OFF": "bg-amber-400",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colorMap[type] || "bg-muted-foreground"}`} />;
}

export default function TournamentPage() {
  const { data: tournaments = [] } = useTournaments(false);
  const upsert = useUpsertTournament();
  const del = useDeleteTournament();

  const [filter, setFilter] = useState<FilterType>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", type: "ONE-OFF" as string });

  const filtered = filter === "ALL" ? tournaments : tournaments.filter((t) => t.type === filter);
  const selected = tournaments.find((t) => t.id === selectedId) ?? null;

  const startNew = () => {
    setDraft({ name: "", type: "ONE-OFF" });
    setCreating(true);
  };

  const saveNew = () => {
    if (!draft.name.trim()) return;
    upsert.mutate({ name: draft.name, type: draft.type, active: true });
    setCreating(false);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-border">
          {(["ALL", ...TOURNAMENT_TYPES] as FilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                filter === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tournament list */}
        <div className="flex-1 overflow-auto">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedId(t.id); setCreating(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-border transition-colors group ${
                selectedId === t.id ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <TypeDot type={t.type} />
              <span className="flex-1 truncate font-medium">{t.name}</span>
              {!t.active && <span className="text-[9px] text-muted-foreground">inactive</span>}
              <ChevronRight className={`h-3 w-3 shrink-0 transition-opacity ${selectedId === t.id ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">No tournaments</p>
          )}
        </div>

        {/* Add button / inline create */}
        <div className="border-t border-border p-2">
          {creating ? (
            <div className="space-y-1.5">
              <input
                autoFocus
                className="grid-cell-input border border-border rounded w-full text-xs"
                placeholder="Tournament name…"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") setCreating(false); }}
              />
              <div className="flex gap-1.5">
                <select
                  className="grid-cell-input border border-border rounded flex-1 text-xs"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                >
                  {TOURNAMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={saveNew} className="text-[hsl(var(--confirmation-yes))] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ) : (
            <button
              onClick={startNew}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80"
            >
              <Plus className="h-3.5 w-3.5" /> Add Tournament
            </button>
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 overflow-auto">
        {selected ? (
          <TournamentDetail tournament={selected} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center space-y-2">
              <Trophy className="h-8 w-8 mx-auto opacity-30" />
              <p>Select a tournament from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Tournament, useUpsertTournament, TOURNAMENT_TYPES } from "@/hooks/useTournaments";
import BookingsGrid from "@/components/BookingsGrid";

type Props = { tournament: Tournament };

export default function TournamentDetail({ tournament }: Props) {
  const upsert = useUpsertTournament();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Tournament>>({});

  const isMCR = tournament.type === "MCR";

  useEffect(() => { setEditing(false); }, [tournament.id]);

  const startEdit = () => {
    setDraft({ ...tournament });
    setEditing(true);
  };

  const save = () => {
    upsert.mutate({ ...draft, id: tournament.id, name: draft.name || tournament.name, type: draft.type || tournament.type } as any);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  const Field = ({ label, field, type = "text", multiline = false }: { label: string; field: keyof Tournament; type?: string; multiline?: boolean }) => {
    const val = editing ? (draft[field] as string) ?? "" : (tournament[field] as string) ?? "";
    return (
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        {editing ? (
          multiline ? (
            <textarea
              className="grid-cell-input border border-border rounded w-full min-h-[60px] text-xs p-1.5"
              value={val}
              onChange={(e) => setDraft({ ...draft, [field]: e.target.value || null })}
            />
          ) : (
            <input
              type={type}
              className="grid-cell-input border border-border rounded w-full text-xs"
              value={val}
              onChange={(e) => setDraft({ ...draft, [field]: e.target.value || null })}
            />
          )
        ) : (
          <p className="text-xs text-foreground">{val || <span className="text-muted-foreground italic">—</span>}</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{tournament.name}</h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-1 ${
            tournament.type === "MCR" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
            tournament.type === "ATP/WTA" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
            "bg-amber-500/15 text-amber-400 border-amber-500/30"
          }`}>{tournament.type}</span>
        </div>
        <div className="flex gap-1.5">
          {editing ? (
            <>
              <button onClick={save} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90">
                <Check className="h-3 w-3" /> Save
              </button>
              <button onClick={cancel} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-muted text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" /> Cancel
              </button>
            </>
          ) : (
            <button onClick={startEdit} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-muted text-muted-foreground hover:text-foreground">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Basic Info — all tournament types */}
      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tournament Name" field="name" />
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
            {editing ? (
              <select
                className="grid-cell-input border border-border rounded w-full text-xs"
                value={draft.type ?? tournament.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              >
                {TOURNAMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <p className="text-xs">{tournament.type}</p>
            )}
          </div>
          <Field label="Date From" field="date_from" type="date" />
          <Field label="Date To" field="date_to" type="date" />
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            {editing ? (
              <select
                className="grid-cell-input border border-border rounded w-full text-xs"
                value={draft.active !== undefined ? (draft.active ? "1" : "0") : (tournament.active ? "1" : "0")}
                onChange={(e) => setDraft({ ...draft, active: e.target.value === "1" })}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            ) : (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                tournament.active ? "bg-[hsl(var(--tag-active))] text-[hsl(var(--tag-active-foreground))]" : "bg-muted text-muted-foreground"
              }`}>
                {tournament.active ? "Active" : "Inactive"}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Advanced sections — only for non-MCR */}
      {!isMCR && (
        <>
          <section className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Venue & Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Venue Name" field="venue_name" />
              <Field label="City" field="city" />
              <Field label="Country" field="country" />
              <Field label="Timezone" field="timezone" />
            </div>
          </section>

          <section className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contacts & Crew</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Project Manager" field="pm_name" />
              <Field label="PM Contact" field="pm_contact" />
            </div>
            <Field label="Crew Notes" field="crew_notes" multiline />
          </section>

          <section className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Technical Setup</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Satellite Info" field="satellite_info" multiline />
              <Field label="Encoding Details" field="encoding_details" multiline />
            </div>
            <Field label="Channel Configuration" field="channel_config" multiline />
          </section>
        </>
      )}
    </div>
  );
}

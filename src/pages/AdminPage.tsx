import React, { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ClipboardPaste } from "lucide-react";
import {
  useLeagues, useUpsertLeague, useDeleteLeague, useBulkInsertLeagues,
  useIncomingChannels, useUpsertIncomingChannel, useDeleteIncomingChannel, useBulkInsertIncomingChannels,
  useTakers, useUpsertTaker, useDeleteTaker, useBulkInsertTakers,
  useTakerChannelMaps, useUpsertTakerChannelMap, useDeleteTakerChannelMap, useBulkInsertTakerChannelMaps,
} from "@/hooks/useLookups";
import BulkPasteDialog, { type BulkColumn } from "@/components/BulkPasteDialog";

// ── Generic toggle badge ─────────────────────────────────────────────────────
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
        active
          ? "bg-[hsl(var(--tag-active))] text-[hsl(var(--tag-active-foreground))]"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Simple name + active table (League, IncomingChannel, Taker) ──────────────
type SimpleRow = { id: string; name: string; active: boolean };

type SimpleTableProps = {
  title: string;
  rows: SimpleRow[];
  onUpsert: (row: { id?: string; name: string; active: boolean }) => void;
  onDelete: (id: string) => void;
  onBulkImport?: (rows: Record<string, string>[]) => Promise<void>;
};

function SimpleTable({ title, rows, onUpsert, onDelete, onBulkImport }: SimpleTableProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", active: true });

  const startNew = () => {
    setDraft({ name: "", active: true });
    setEditing("new");
  };

  const startEdit = (r: SimpleRow) => {
    setDraft({ name: r.name, active: r.active });
    setEditing(r.id);
  };

  const save = () => {
    if (!draft.name.trim()) return;
    onUpsert({ id: editing === "new" ? undefined : editing!, ...draft });
    setEditing(null);
  };

  const cancel = () => setEditing(null);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {onBulkImport && (
            <button onClick={() => setBulkOpen(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium">
              <ClipboardPaste className="h-3.5 w-3.5" /> Paste
            </button>
          )}
          <button onClick={startNew} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Name</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Status</th>
            <th className="px-2 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && (
            <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
              <td className="px-2 py-1">
                <input autoFocus className="grid-cell-input border border-ring rounded" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name…" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
              </td>
              <td className="px-2 py-1">
                <select className="grid-cell-input border border-border rounded" value={draft.active ? "1" : "0"} onChange={(e) => setDraft({ ...draft, active: e.target.value === "1" })}>
                  <option value="1">Active</option><option value="0">Inactive</option>
                </select>
              </td>
              <td className="px-2 py-1">
                <div className="flex gap-1">
                  <button onClick={save} className="text-[hsl(var(--confirmation-yes))] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0 group hover:bg-muted/30">
              {editing === r.id ? (
                <>
                  <td className="px-2 py-1">
                    <input autoFocus className="grid-cell-input border border-ring rounded" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
                  </td>
                  <td className="px-2 py-1">
                    <select className="grid-cell-input border border-border rounded" value={draft.active ? "1" : "0"} onChange={(e) => setDraft({ ...draft, active: e.target.value === "1" })}>
                      <option value="1">Active</option><option value="0">Inactive</option>
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex gap-1">
                      <button onClick={save} className="text-[hsl(var(--confirmation-yes))] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2"><ActiveBadge active={r.active} /></td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => onDelete(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {rows.length === 0 && editing !== "new" && (
            <tr><td colSpan={3} className="px-3 py-4 text-muted-foreground text-center">No entries yet.</td></tr>
          )}
        </tbody>
      </table>
      {onBulkImport && (
        <BulkPasteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          title={title}
          columns={[
            { key: "name", label: "Name", required: true },
            { key: "active", label: "Active (yes/no)" },
          ]}
          onImport={onBulkImport}
        />
      )}
    </div>
  );
}

// ── TakerChannelMap table ─────────────────────────────────────────────────────
type TCMRow = { id: string; label: string; actual_channel_id: string; taker_id: string | null; active: boolean; takers?: { name: string } | null };

function TakerChannelMapTable() {
  const { data: rows = [] } = useTakerChannelMaps(false);
  const { data: takers = [] } = useTakers(true);
  const upsert = useUpsertTakerChannelMap();
  const del = useDeleteTakerChannelMap();

  const blank = { label: "", actual_channel_id: "", taker_id: null as string | null, active: true };
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank);

  const startNew = () => { setDraft(blank); setEditing("new"); };
  const startEdit = (r: TCMRow) => { setDraft({ label: r.label, actual_channel_id: r.actual_channel_id, taker_id: r.taker_id, active: r.active }); setEditing(r.id); };
  const save = () => {
    if (!draft.label.trim() || !draft.actual_channel_id.trim()) return;
    upsert.mutate({ id: editing === "new" ? undefined : editing!, ...draft });
    setEditing(null);
  };
  const cancel = () => setEditing(null);

  const EditRow = () => (
    <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
      <td className="px-2 py-1"><input autoFocus className="grid-cell-input border border-ring rounded" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Label…" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} /></td>
      <td className="px-2 py-1"><input className="grid-cell-input border border-border rounded" value={draft.actual_channel_id} onChange={(e) => setDraft({ ...draft, actual_channel_id: e.target.value })} placeholder="CH-001…" /></td>
      <td className="px-2 py-1">
        <select className="grid-cell-input border border-border rounded" value={draft.taker_id ?? ""} onChange={(e) => setDraft({ ...draft, taker_id: e.target.value || null })}>
          <option value="">— none —</option>
          {takers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </td>
      <td className="px-2 py-1">
        <select className="grid-cell-input border border-border rounded" value={draft.active ? "1" : "0"} onChange={(e) => setDraft({ ...draft, active: e.target.value === "1" })}>
          <option value="1">Active</option><option value="0">Inactive</option>
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
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Taker Channel Map</h2>
        <button onClick={startNew} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Label</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Actual Ch. ID</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Taker</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Status</th>
            <th className="px-2 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && <EditRow />}
          {(rows as TCMRow[]).map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0 group hover:bg-muted/30">
              {editing === r.id ? <EditRow /> : (
                <>
                  <td className="px-3 py-2 font-mono">{r.label}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{r.actual_channel_id}</td>
                  <td className="px-3 py-2">{r.takers?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2"><ActiveBadge active={r.active} /></td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {rows.length === 0 && editing !== "new" && (
            <tr><td colSpan={5} className="px-3 py-4 text-muted-foreground text-center">No entries yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Admin Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: leagues = [] } = useLeagues(false);
  const { data: channels = [] } = useIncomingChannels(false);
  const { data: takers = [] } = useTakers(false);

  const upsertLeague = useUpsertLeague();
  const deleteLeague = useDeleteLeague();
  const upsertChannel = useUpsertIncomingChannel();
  const deleteChannel = useDeleteIncomingChannel();
  const upsertTaker = useUpsertTaker();
  const deleteTaker = useDeleteTaker();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimpleTable
          title="Leagues"
          rows={leagues}
          onUpsert={(r) => upsertLeague.mutate(r)}
          onDelete={(id) => deleteLeague.mutate(id)}
        />
        <SimpleTable
          title="Incoming Channels"
          rows={channels}
          onUpsert={(r) => upsertChannel.mutate(r)}
          onDelete={(id) => deleteChannel.mutate(id)}
        />
        <SimpleTable
          title="Takers"
          rows={takers}
          onUpsert={(r) => upsertTaker.mutate(r)}
          onDelete={(id) => deleteTaker.mutate(id)}
        />
        <TakerChannelMapTable />
      </div>
    </div>
  );
}

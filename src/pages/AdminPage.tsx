import React, { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ClipboardPaste } from "lucide-react";
import {
  useIncomingChannels, useUpsertIncomingChannel, useDeleteIncomingChannel, useBulkInsertIncomingChannels,
  useLeagues, useUpsertLeague, useDeleteLeague,
  useTonybetChannelMaps, useUpsertTonybetChannelMap, useDeleteTonybetChannelMap, useBulkInsertTonybetChannelMaps,
} from "@/hooks/useLookups";
import BulkPasteDialog from "@/components/BulkPasteDialog";

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

// ── TonyBet Virsliga Channel Map table ────────────────────────────────────────
type TBRow = { id: string; taker_name?: string | null; label: string; actual_channel_id: string; active: boolean };

function TonybetChannelMapTable() {
  const { data: rows = [] } = useTonybetChannelMaps(false);
  const upsert = useUpsertTonybetChannelMap();
  const del = useDeleteTonybetChannelMap();
  const bulkInsert = useBulkInsertTonybetChannelMaps();

  const blank = { taker_name: "", label: "", actual_channel_id: "", active: true };
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank);
  const [bulkOpen, setBulkOpen] = useState(false);

  const startNew = () => { setDraft(blank); setEditing("new"); };
  const startEdit = (r: TBRow) => { setDraft({ taker_name: r.taker_name ?? "", label: r.label, actual_channel_id: r.actual_channel_id, active: r.active }); setEditing(r.id); };
  const save = () => {
    if (!draft.taker_name?.trim()) return;
    upsert.mutate({ id: editing === "new" ? undefined : editing!, taker_name: draft.taker_name.trim(), label: draft.label.trim() || draft.taker_name.trim(), actual_channel_id: draft.actual_channel_id, active: draft.active });
    setEditing(null);
  };
  const cancel = () => setEditing(null);

  const handleBulkImport = async (parsed: Record<string, string>[]) => {
    await bulkInsert.mutateAsync(parsed.map((r) => ({
      taker_name: r.taker_name || null,
      label: r.label || r.taker_name || "",
      actual_channel_id: r.actual_channel_id || "",
      active: !r.active || r.active.toLowerCase() !== "no",
    })));
  };

  const EditRow = () => (
    <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
      <td className="px-2 py-1"><input autoFocus className="grid-cell-input border border-ring rounded" value={draft.taker_name} onChange={(e) => setDraft({ ...draft, taker_name: e.target.value })} placeholder="Taker name…" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} /></td>
      <td className="px-2 py-1"><input className="grid-cell-input border border-border rounded" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="CHID…" /></td>
      <td className="px-2 py-1"><input className="grid-cell-input border border-border rounded" value={draft.actual_channel_id} onChange={(e) => setDraft({ ...draft, actual_channel_id: e.target.value })} placeholder="Port/Key…" /></td>
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
    <div className="bg-card border border-border rounded-lg overflow-hidden md:col-span-2">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Source/Taker Map (TonyBet Virsliga)</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkOpen(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium">
            <ClipboardPaste className="h-3.5 w-3.5" /> Paste
          </button>
          <button onClick={startNew} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"><Plus className="h-3.5 w-3.5" /> Add</button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Taker</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[120px]">CHID</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[120px]">Port/Key</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[70px]">Status</th>
            <th className="px-2 py-2 w-[60px]"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && <EditRow />}
          {(rows as TBRow[]).map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0 group hover:bg-muted/30">
              {editing === r.id ? <EditRow /> : (
                <>
                  <td className="px-3 py-2">{r.taker_name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 font-mono">{r.label}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{r.actual_channel_id}</td>
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
      <BulkPasteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="TonyBet Virsliga Source/Taker Map"
        columns={[
          { key: "taker_name", label: "Taker Name", required: true },
          { key: "label", label: "CHID" },
          { key: "actual_channel_id", label: "Port/Key" },
          { key: "active", label: "Active (yes/no)" },
        ]}
        onImport={handleBulkImport}
      />
    </div>
  );
}


// CategoriesTable moved to src/components/CategoriesAdmin.tsx
// ── Admin Page ────────────────────────────────────────────────────────────────

import ClientAccessAdmin from "@/components/ClientAccessAdmin";
import CategoriesAdmin from "@/components/CategoriesAdmin";

export default function AdminPage() {
  const { data: channels = [] } = useIncomingChannels(false);
  const { data: leagues = [] } = useLeagues(false);
  const [activeTab, setActiveTab] = useState<"settings" | "client-access" | "categories">("settings");

  const upsertChannel = useUpsertIncomingChannel();
  const deleteChannel = useDeleteIncomingChannel();
  const bulkChannels = useBulkInsertIncomingChannels();
  const upsertLeague = useUpsertLeague();
  const deleteLeague = useDeleteLeague();

  const simpleBulk = (mutate: (rows: { name: string; active: boolean }[]) => Promise<any>) =>
    async (parsed: Record<string, string>[]) => {
      await mutate(parsed.map((r) => ({
        name: r.name,
        active: !r.active || r.active.toLowerCase() !== "no",
      })));
    };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        <button
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
        <button
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("categories")}
        >
          Categories
        </button>
        <button
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "client-access"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("client-access")}
        >
          Client Access
        </button>
      </div>

      {activeTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SimpleTable
            title="Incoming Channels"
            rows={channels}
            onUpsert={(r) => upsertChannel.mutate(r)}
            onDelete={(id) => deleteChannel.mutate(id)}
            onBulkImport={simpleBulk(bulkChannels.mutateAsync)}
          />
          <SimpleTable
            title="Leagues"
            rows={leagues}
            onUpsert={(r) => upsertLeague.mutate(r)}
            onDelete={(id) => deleteLeague.mutate(id)}
          />
          <TakersTable />
          <TakerChannelMapTable />
          <TonybetChannelMapTable />
        </div>
      )}

      {activeTab === "categories" && <CategoriesAdmin />}

      {activeTab === "client-access" && <ClientAccessAdmin />}
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Check, X, ClipboardPaste } from "lucide-react";
import {
  useIncomingChannels, useUpsertIncomingChannel, useDeleteIncomingChannel, useBulkInsertIncomingChannels,
  useLeagues, useUpsertLeague, useDeleteLeague,
  useTakers, useUpsertTaker, useDeleteTaker, useBulkInsertTakers,
  useTakerChannelMaps, useUpsertTakerChannelMap, useDeleteTakerChannelMap, useBulkInsertTakerChannelMaps,
  useTonybetChannelMaps, useUpsertTonybetChannelMap, useDeleteTonybetChannelMap, useBulkInsertTonybetChannelMaps,
  useCategories, useUpsertCategory, useDeleteCategory,
  type TakerRecord,
} from "@/hooks/useLookups";
import { ChevronDown, ChevronRight } from "lucide-react";
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
type TCMRow = { id: string; label: string; actual_channel_id: string; taker_id: string | null; taker_name?: string | null; active: boolean; takers?: { name: string } | null };

function TakerChannelMapTable() {
  const { data: rows = [] } = useTakerChannelMaps(false);
  const upsert = useUpsertTakerChannelMap();
  const del = useDeleteTakerChannelMap();
  const bulkInsert = useBulkInsertTakerChannelMaps();

  const blank = { label: "", actual_channel_id: "", taker_name: "", active: true };
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank);
  const [bulkOpen, setBulkOpen] = useState(false);

  const startNew = () => { setDraft(blank); setEditing("new"); };
  const startEdit = (r: TCMRow) => { setDraft({ label: r.label, actual_channel_id: r.actual_channel_id, taker_name: r.taker_name ?? r.takers?.name ?? "", active: r.active }); setEditing(r.id); };
  const save = () => {
    if (!draft.taker_name?.trim()) return;
    upsert.mutate({ id: editing === "new" ? undefined : editing!, label: draft.label.trim() || draft.taker_name.trim(), actual_channel_id: draft.actual_channel_id, taker_id: null, taker_name: draft.taker_name.trim(), active: draft.active });
    setEditing(null);
  };
  const cancel = () => setEditing(null);

  const handleBulkImport = async (parsed: Record<string, string>[]) => {
    const mapped = parsed.map((r) => ({
      label: r.label || r.taker_name || "",
      actual_channel_id: r.actual_channel_id || "",
      taker_id: null,
      taker_name: r.taker_name || null,
      active: !r.active || r.active.toLowerCase() !== "no",
    }));
    await bulkInsert.mutateAsync(mapped);
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
        <h2 className="text-sm font-semibold">Taker Channel Map (MCR)</h2>
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
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[200px]">Taker</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[80px]">CHID</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[100px]">Port/Key</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-[70px]">Status</th>
            <th className="px-2 py-2 w-[60px]"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && <EditRow />}
          {(rows as TCMRow[]).map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0 group hover:bg-muted/30">
              {editing === r.id ? <EditRow /> : (
                <>
                  <td className="px-3 py-2">{r.taker_name ?? r.takers?.name ?? <span className="text-muted-foreground">—</span>}</td>
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
        title="Taker Channel Map"
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


const TAKER_EXTRA_FIELDS: { key: keyof TakerRecord; label: string }[] = [
  { key: "email_subject", label: "Email / e-subject" },
  { key: "communication_method", label: "Comm. Method" },
  { key: "phone_number", label: "Phone" },
  { key: "quality", label: "Quality" },
  { key: "audio1", label: "Audio 1" },
  { key: "protocol", label: "Protocol" },
  { key: "host", label: "Host/IP" },
  { key: "port", label: "Port" },
  { key: "stream_key", label: "StreamKey" },
  { key: "username", label: "User/StreamID" },
  { key: "password", label: "Password" },
  { key: "backup_host", label: "2nd Host/IP" },
  { key: "backup_port", label: "2nd Port" },
  { key: "backup_stream_key", label: "2nd StreamKey" },
  { key: "backup_username", label: "2nd User/StreamID" },
  { key: "backup_password", label: "2nd Password" },
];

function TakersTable() {
  const { data: allRows = [] } = useTakers(false);
  // Exclude HGM and MCR-prefixed takers (those belong to Hogmore/MCR, not Advanced)
  const rows = useMemo(() => allRows.filter((r: any) => {
    const name = (r.name || "").toUpperCase();
    return !name.startsWith("HGM") && !name.startsWith("MCR");
  }), [allRows]);
  const upsert = useUpsertTaker();
  const del = useDeleteTaker();
  const bulkInsert = useBulkInsertTakers();

  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<TakerRecord>({ name: "", active: true });
  const [bulkOpen, setBulkOpen] = useState(false);

  const startNew = () => { setDraft({ name: "", active: true }); setEditing("new"); };
  const startEdit = (r: any) => {
    setDraft({
      id: r.id, name: r.name, active: r.active,
      email_subject: r.email_subject ?? "", communication_method: r.communication_method ?? "",
      phone_number: r.phone_number ?? "", quality: r.quality ?? "", audio1: r.audio1 ?? "",
      protocol: r.protocol ?? "", host: r.host ?? "", port: r.port ?? "",
      stream_key: r.stream_key ?? "", username: r.username ?? "", password: r.password ?? "",
      backup_host: r.backup_host ?? "", backup_port: r.backup_port ?? "",
      backup_stream_key: r.backup_stream_key ?? "", backup_username: r.backup_username ?? "",
      backup_password: r.backup_password ?? "",
    });
    setEditing(r.id);
    setExpanded((p) => ({ ...p, [r.id]: true }));
  };
  const save = () => {
    if (!draft.name.trim()) return;
    const payload = { ...draft };
    if (editing === "new") delete payload.id;
    // Convert empty strings to null
    for (const k of Object.keys(payload) as (keyof TakerRecord)[]) {
      if (typeof payload[k] === "string" && !(payload[k] as string).trim()) (payload as any)[k] = null;
    }
    payload.name = draft.name.trim();
    upsert.mutate(payload);
    setEditing(null);
  };
  const cancel = () => setEditing(null);
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleBulkImport = async (parsed: Record<string, string>[]) => {
    await bulkInsert.mutateAsync(parsed.map((r) => ({
      name: r.name,
      active: !r.active || r.active.toLowerCase() !== "no",
    })));
  };

  const DetailFields = () => (
    <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
      <td colSpan={3} className="px-3 py-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {TAKER_EXTRA_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-28 shrink-0">{f.label}</label>
              <input
                className="grid-cell-input border border-border rounded flex-1 text-xs"
                type={f.key.includes("password") ? "password" : "text"}
                value={(draft[f.key] as string) ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
              />
            </div>
          ))}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden md:col-span-2">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Takers Advanced</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkOpen(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium">
            <ClipboardPaste className="h-3.5 w-3.5" /> Paste
          </button>
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
            <>
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
              <DetailFields />
            </>
          )}
          {rows.map((r: any) => (
            <React.Fragment key={r.id}>
              <tr className="border-b border-border last:border-b-0 group hover:bg-muted/30">
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
                    <td className="px-3 py-2">
                      <button onClick={() => toggle(r.id)} className="flex items-center gap-1 hover:text-primary">
                        {expanded[r.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {r.name}
                      </button>
                    </td>
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
              {editing === r.id && <DetailFields />}
              {expanded[r.id] && editing !== r.id && (
                <tr className="border-b border-border bg-muted/20">
                  <td colSpan={3} className="px-3 py-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {TAKER_EXTRA_FIELDS.map((f) => {
                        const val = (r as any)[f.key];
                        if (!val) return null;
                        return (
                          <div key={f.key} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-28 shrink-0">{f.label}</span>
                            <span className="text-xs truncate">{f.key.includes("password") ? "••••••" : val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {rows.length === 0 && editing !== "new" && (
            <tr><td colSpan={3} className="px-3 py-4 text-muted-foreground text-center">No entries yet.</td></tr>
          )}
        </tbody>
      </table>
      <BulkPasteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Takers Advanced"
        columns={[
          { key: "name", label: "Name", required: true },
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

export default function AdminPage() {
  const { data: channels = [] } = useIncomingChannels(false);
  const { data: leagues = [] } = useLeagues(false);
  const [activeTab, setActiveTab] = useState<"settings" | "client-access">("settings");

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
          <CategoriesTable />
          <TakerChannelMapTable />
          <TonybetChannelMapTable />
        </div>
      )}

      {activeTab === "client-access" && <ClientAccessAdmin />}
    </div>
  );
}

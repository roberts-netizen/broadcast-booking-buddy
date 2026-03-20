import React, { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ClipboardPaste } from "lucide-react";
import {
  useIncomingChannels, useUpsertIncomingChannel, useDeleteIncomingChannel, useBulkInsertIncomingChannels,
  useTakers, useUpsertTaker, useDeleteTaker, useBulkInsertTakers,
  useTakerChannelMaps, useUpsertTakerChannelMap, useDeleteTakerChannelMap, useBulkInsertTakerChannelMaps,
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
type TCMRow = { id: string; label: string; actual_channel_id: string; taker_id: string | null; active: boolean; takers?: { name: string } | null };

function TakerChannelMapTable() {
  const { data: rows = [] } = useTakerChannelMaps(false);
  const { data: takers = [] } = useTakers(true);
  const upsert = useUpsertTakerChannelMap();
  const del = useDeleteTakerChannelMap();
  const bulkInsert = useBulkInsertTakerChannelMaps();

  const blank = { label: "", actual_channel_id: "", taker_id: null as string | null, active: true };
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank);
  const [bulkOpen, setBulkOpen] = useState(false);

  const startNew = () => { setDraft(blank); setEditing("new"); };
  const startEdit = (r: TCMRow) => { setDraft({ label: r.label, actual_channel_id: r.actual_channel_id, taker_id: r.taker_id, active: r.active }); setEditing(r.id); };
  const save = () => {
    if (!draft.label.trim() || !draft.actual_channel_id.trim()) return;
    upsert.mutate({ id: editing === "new" ? undefined : editing!, ...draft });
    setEditing(null);
  };
  const cancel = () => setEditing(null);

  const handleBulkImport = async (parsed: Record<string, string>[]) => {
    const mapped = parsed.map((r) => {
      const matchedTaker = takers.find((t: any) => t.name.toLowerCase() === r.taker_name?.toLowerCase());
      return {
        label: r.label,
        actual_channel_id: r.actual_channel_id,
        taker_id: matchedTaker?.id ?? null,
        active: !r.active || r.active.toLowerCase() !== "no",
      };
    });
    await bulkInsert.mutateAsync(mapped);
  };

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
      <BulkPasteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Taker Channel Map"
        columns={[
          { key: "label", label: "Label", required: true },
          { key: "actual_channel_id", label: "Actual Ch. ID", required: true },
          { key: "taker_name", label: "Taker Name" },
          { key: "active", label: "Active (yes/no)" },
        ]}
        onImport={handleBulkImport}
      />
    </div>
  );
}

// ── Takers table (expanded with all technical fields) ─────────────────────────
const TAKER_EXTRA_FIELDS: { key: keyof TakerRecord; label: string }[] = [
  { key: "email_subject", label: "Email / e-subject" },
  { key: "communication_method", label: "Comm. Method" },
  { key: "phone_number", label: "Phone" },
  { key: "quality", label: "Quality" },
  { key: "audio", label: "Audio" },
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
  const { data: rows = [] } = useTakers(false);
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
      phone_number: r.phone_number ?? "", quality: r.quality ?? "", audio: r.audio ?? "",
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
        <h2 className="text-sm font-semibold">Takers</h2>
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
        title="Takers"
        columns={[
          { key: "name", label: "Name", required: true },
          { key: "active", label: "Active (yes/no)" },
        ]}
        onImport={handleBulkImport}
      />
    </div>
  );
}

// ── Categories table ──────────────────────────────────────────────────────────
function CategoriesTable() {
  const { data: rows = [] } = useCategories(false);
  const upsert = useUpsertCategory();
  const del = useDeleteCategory();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", type: "standard", active: true });

  const startNew = () => { setDraft({ name: "", type: "standard", active: true }); setEditing("new"); };
  const startEdit = (r: { id: string; name: string; type: string; active: boolean }) => {
    setDraft({ name: r.name, type: r.type, active: r.active });
    setEditing(r.id);
  };
  const save = () => {
    if (!draft.name.trim()) return;
    upsert.mutate({ id: editing === "new" ? undefined : editing!, ...draft });
    setEditing(null);
  };
  const cancel = () => setEditing(null);

  const EditRow = () => (
    <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
      <td className="px-2 py-1">
        <input autoFocus className="grid-cell-input border border-ring rounded" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name…" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
      </td>
      <td className="px-2 py-1">
        <select className="grid-cell-input border border-border rounded" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
          <option value="standard">Standard</option>
          <option value="advanced">Advanced</option>
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
        <h2 className="text-sm font-semibold">Categories</h2>
        <button onClick={startNew} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Name</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-28">Type</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Status</th>
            <th className="px-2 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && <EditRow />}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0 group hover:bg-muted/30">
              {editing === r.id ? <EditRow /> : (
                <>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      r.type === "advanced"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {r.type}
                    </span>
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
          ))}
          {rows.length === 0 && editing !== "new" && (
            <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground text-center">No entries yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Admin Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: channels = [] } = useIncomingChannels(false);

  const upsertChannel = useUpsertIncomingChannel();
  const deleteChannel = useDeleteIncomingChannel();
  const bulkChannels = useBulkInsertIncomingChannels();

  const simpleBulk = (mutate: (rows: { name: string; active: boolean }[]) => Promise<any>) =>
    async (parsed: Record<string, string>[]) => {
      await mutate(parsed.map((r) => ({
        name: r.name,
        active: !r.active || r.active.toLowerCase() !== "no",
      })));
    };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimpleTable
          title="Incoming Channels"
          rows={channels}
          onUpsert={(r) => upsertChannel.mutate(r)}
          onDelete={(id) => deleteChannel.mutate(id)}
          onBulkImport={simpleBulk(bulkChannels.mutateAsync)}
        />
        <TakersTable />
        <CategoriesTable />
        <TakerChannelMapTable />
      </div>
    </div>
  );
}

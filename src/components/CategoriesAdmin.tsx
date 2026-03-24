import React, { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  useCategories, useUpsertCategory, useDeleteCategory,
  useTakersByCategory, useUpsertCategoryTaker, useDeleteTaker,
  useLeaguesByCategory, useUpsertLeague, useDeleteLeague,
  useIncomingChannelsByCategory, useUpsertIncomingChannel, useDeleteIncomingChannel,
  type TakerRecord, type CategoryRecord,
} from "@/hooks/useLookups";

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
      active ? "bg-[hsl(var(--tag-active))] text-[hsl(var(--tag-active-foreground))]" : "bg-muted text-muted-foreground"
    }`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  mcr: "MCR", adv: "ADV", hogmore: "Hogmore", custom: "Custom",
};

const CATEGORY_TYPE_STYLES: Record<string, string> = {
  mcr: "bg-blue-500/15 text-blue-600",
  adv: "bg-primary/15 text-primary",
  hogmore: "bg-orange-500/15 text-orange-600",
  custom: "bg-violet-500/15 text-violet-600",
};

// ── Field definitions for MCR vs ADV taker pools ─────────────────────────────
const MCR_FIELDS: { key: keyof TakerRecord; label: string }[] = [
  { key: "name", label: "Taker" },
  { key: "stream_key", label: "CHID" },
  { key: "host", label: "Port/Key" },
];

const ADV_INLINE_FIELDS: { key: keyof TakerRecord; label: string }[] = [
  { key: "email_subject", label: "Email Subject" },
  { key: "communication_method", label: "Communication" },
  { key: "audio1", label: "Audio 1" },
  { key: "audio2", label: "Audio 2" },
  { key: "protocol", label: "Protocol" },
  { key: "host", label: "Host/IP" },
  { key: "stream_key", label: "StreamKey" },
  { key: "port", label: "Port" },
  { key: "password", label: "Password/StreamID" },
  { key: "quality", label: "Quality" },
];

const ADV_DETAIL_FIELDS: { key: keyof TakerRecord; label: string }[] = [
  { key: "username", label: "Username" },
  { key: "phone_number", label: "Phone" },
  { key: "settings", label: "Settings" },
  { key: "backup_host", label: "2nd Host/IP" },
  { key: "backup_port", label: "2nd Port" },
  { key: "backup_stream_key", label: "2nd StreamKey" },
  { key: "backup_username", label: "2nd User/StreamID" },
  { key: "backup_password", label: "2nd Password" },
];

// ── Simple Name+Active Pool (for Leagues and Sources/Incoming Channels) ──────
function SimplePool({ categoryId, title, useData, useUpsertHook, useDeleteHook, entityName }: {
  categoryId: string;
  title: string;
  useData: (catId: string | null) => { data: any[] | undefined };
  useUpsertHook: () => { mutate: (row: any) => void };
  useDeleteHook: () => { mutate: (id: string) => void };
  entityName: string;
}) {
  const { data: rows = [] } = useData(categoryId);
  const upsert = useUpsertHook();
  const del = useDeleteHook();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", active: true });

  const startNew = () => { setDraft({ name: "", active: true }); setEditing("new"); };
  const startEdit = (r: any) => { setDraft({ name: r.name, active: r.active }); setEditing(r.id); };
  const save = () => {
    if (!draft.name.trim()) return;
    const payload: any = { name: draft.name.trim(), active: draft.active, category_id: categoryId };
    if (editing !== "new") payload.id = editing;
    upsert.mutate(payload);
    setEditing(null);
  };
  const cancel = () => setEditing(null);

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title} ({rows.length})</span>
        <button onClick={startNew} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium">
          <Plus className="h-3 w-3" /> Add {entityName}
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-y border-border">
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">Name</th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-16">Status</th>
            <th className="px-2 py-1.5 w-14"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && (
            <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
              <td className="px-2 py-1"><input autoFocus className="grid-cell-input border border-ring rounded w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name…" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} /></td>
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
          {rows.map((r: any) => (
            <tr key={r.id} className="border-b border-border last:border-b-0 group hover:bg-muted/30">
              {editing === r.id ? (
                <>
                  <td className="px-2 py-1"><input autoFocus className="grid-cell-input border border-ring rounded w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} /></td>
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
                  <td className="px-3 py-1.5">{r.name}</td>
                  <td className="px-3 py-1.5"><ActiveBadge active={r.active} /></td>
                  <td className="px-2 py-1.5">
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
            <tr><td colSpan={3} className="px-3 py-3 text-muted-foreground text-center text-[10px]">No {entityName.toLowerCase()}s yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── MCR Taker Pool ───────────────────────────────────────────────────────────
function McrTakerPool({ category }: { category: CategoryRecord }) {
  const { data: takers = [] } = useTakersByCategory(category.id);
  const upsert = useUpsertCategoryTaker();
  const del = useDeleteTaker();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<TakerRecord>({ name: "", active: true });

  const startNew = () => { setDraft({ name: "", active: true }); setEditing("new"); };
  const startEdit = (r: any) => {
    setDraft({ id: r.id, name: r.name, active: r.active, stream_key: r.stream_key ?? "", host: r.host ?? "" });
    setEditing(r.id);
  };
  const save = () => {
    if (!draft.name.trim()) return;
    const payload: any = { name: draft.name.trim(), active: draft.active, category_id: category.id, stream_key: draft.stream_key?.trim() || null, host: draft.host?.trim() || null };
    if (editing !== "new") payload.id = editing;
    upsert.mutate(payload);
    setEditing(null);
  };
  const cancel = () => setEditing(null);

  const EditRow = () => (
    <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
      <td className="px-2 py-1"><input autoFocus className="grid-cell-input border border-ring rounded w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Taker…" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} /></td>
      <td className="px-2 py-1"><input className="grid-cell-input border border-border rounded w-full" value={draft.stream_key ?? ""} onChange={(e) => setDraft({ ...draft, stream_key: e.target.value })} placeholder="CHID…" /></td>
      <td className="px-2 py-1"><input className="grid-cell-input border border-border rounded w-full" value={draft.host ?? ""} onChange={(e) => setDraft({ ...draft, host: e.target.value })} placeholder="Port/Key…" /></td>
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
    <div className="mb-2">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Taker Pool ({takers.length})</span>
        <button onClick={startNew} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium">
          <Plus className="h-3 w-3" /> Add Taker
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-y border-border">
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-[200px]">Taker</th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-[100px]">CHID</th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-[120px]">Port/Key</th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-16">Status</th>
            <th className="px-2 py-1.5 w-14"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && <EditRow />}
          {takers.map((t: any) => (
            <React.Fragment key={t.id}>
              {editing === t.id ? <EditRow /> : (
                <tr className="border-b border-border last:border-b-0 group hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-medium">{t.name}</td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{t.stream_key || "—"}</td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{t.host || "—"}</td>
                  <td className="px-3 py-1.5"><ActiveBadge active={t.active} /></td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(t)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => del.mutate(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {takers.length === 0 && editing !== "new" && (
            <tr><td colSpan={5} className="px-3 py-3 text-muted-foreground text-center text-[10px]">No takers in this pool yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── ADV/Custom Taker Pool ────────────────────────────────────────────────────
function AdvTakerPool({ category }: { category: CategoryRecord }) {
  const { data: takers = [] } = useTakersByCategory(category.id);
  const upsert = useUpsertCategoryTaker();
  const del = useDeleteTaker();

  const [editing, setEditing] = useState<string | null>(null);
  const [detailExpanded, setDetailExpanded] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<TakerRecord>({ name: "", active: true });

  const blankDraft: TakerRecord = { name: "", active: true };
  const startNew = () => { setDraft(blankDraft); setEditing("new"); };
  const startEdit = (r: any) => {
    const d: any = { id: r.id, name: r.name, active: r.active };
    [...ADV_INLINE_FIELDS, ...ADV_DETAIL_FIELDS].forEach((f) => { d[f.key] = r[f.key] ?? ""; });
    setDraft(d);
    setEditing(r.id);
  };
  const save = () => {
    if (!draft.name.trim()) return;
    const payload: any = { ...draft, category_id: category.id };
    if (editing === "new") delete payload.id;
    for (const k of Object.keys(payload)) {
      if (typeof payload[k] === "string" && !payload[k].trim()) payload[k] = null;
    }
    payload.name = draft.name.trim();
    upsert.mutate(payload);
    setEditing(null);
  };
  const cancel = () => setEditing(null);
  const toggleDetail = (id: string) => setDetailExpanded((p) => ({ ...p, [id]: !p[id] }));

  const totalCols = 2 + ADV_INLINE_FIELDS.length + 1;

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Taker Pool ({takers.length})</span>
        <button onClick={startNew} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium">
          <Plus className="h-3 w-3" /> Add Taker
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[1100px]">
          <thead>
            <tr className="bg-muted/40 border-y border-border">
              <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap min-w-[120px]">Name</th>
              {ADV_INLINE_FIELDS.map((f) => (
                <th key={f.key} className="px-1 py-1.5 text-left text-[10px] font-semibold text-muted-foreground whitespace-nowrap min-w-[80px]">{f.label}</th>
              ))}
              <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-16">Status</th>
              <th className="px-2 py-1.5 w-14"></th>
            </tr>
          </thead>
          <tbody>
            {editing === "new" && (
              <>
                <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
                  <td className="px-1 py-1">
                    <input autoFocus className="grid-cell-input border border-ring rounded w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name…" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
                  </td>
                  {ADV_INLINE_FIELDS.map((f) => (
                    <td key={f.key} className="px-1 py-1">
                      <input className="grid-cell-input border border-border rounded w-full text-xs" type={f.key === "password" ? "password" : "text"} value={(draft[f.key] as string) ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} placeholder={f.label} />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <select className="grid-cell-input border border-border rounded" value={draft.active ? "1" : "0"} onChange={(e) => setDraft({ ...draft, active: e.target.value === "1" })}>
                      <option value="1">Active</option><option value="0">Inactive</option>
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex gap-1">
                      <button onClick={save} className="text-[hsl(var(--confirmation-yes))] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
                  <td colSpan={totalCols} className="px-3 py-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {ADV_DETAIL_FIELDS.map((f) => (
                        <div key={f.key} className="flex items-center gap-2">
                          <label className="text-[10px] text-muted-foreground w-28 shrink-0">{f.label}</label>
                          <input className="grid-cell-input border border-border rounded flex-1 text-xs" type={f.key.includes("password") ? "password" : "text"} value={(draft[f.key] as string) ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              </>
            )}
            {takers.map((t: any) => (
              <React.Fragment key={t.id}>
                <tr className="border-b border-border last:border-b-0 group hover:bg-muted/30">
                  {editing === t.id ? (
                    <>
                      <td className="px-1 py-1">
                        <input autoFocus className="grid-cell-input border border-ring rounded w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
                      </td>
                      {ADV_INLINE_FIELDS.map((f) => (
                        <td key={f.key} className="px-1 py-1">
                          <input className="grid-cell-input border border-border rounded w-full text-xs" type={f.key === "password" ? "password" : "text"} value={(draft[f.key] as string) ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} placeholder={f.label} />
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        <select className="grid-cell-input border border-border rounded" value={draft.active ? "1" : "0"} onChange={(e) => setDraft({ ...draft, active: e.target.value === "1" })}>
                          <option value="1">Active</option><option value="0">Inactive</option>
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <div className="flex gap-1">
                          <button onClick={save} className="text-[hsl(var(--confirmation-yes))] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-2">
                        <button onClick={() => toggleDetail(t.id)} className="flex items-center gap-1 hover:text-primary whitespace-nowrap">
                          {detailExpanded[t.id] ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                          {t.name}
                        </button>
                      </td>
                      {ADV_INLINE_FIELDS.map((f) => {
                        const val = t[f.key];
                        return (
                          <td key={f.key} className="px-1 py-2 text-xs truncate max-w-[100px]" title={val || ""}>
                            {f.key === "password" && val ? "••••" : (val || "—")}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2"><ActiveBadge active={t.active} /></td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(t)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => del.mutate(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                {editing === t.id && (
                  <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
                    <td colSpan={totalCols} className="px-3 py-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {ADV_DETAIL_FIELDS.map((f) => (
                          <div key={f.key} className="flex items-center gap-2">
                            <label className="text-[10px] text-muted-foreground w-28 shrink-0">{f.label}</label>
                            <input className="grid-cell-input border border-border rounded flex-1 text-xs" type={f.key.includes("password") ? "password" : "text"} value={(draft[f.key] as string) ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                {detailExpanded[t.id] && editing !== t.id && (
                  <tr className="border-b border-border bg-muted/20">
                    <td colSpan={totalCols} className="px-3 py-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {ADV_DETAIL_FIELDS.map((f) => {
                          const val = (t as any)[f.key];
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
            {takers.length === 0 && editing !== "new" && (
              <tr><td colSpan={totalCols} className="px-3 py-3 text-muted-foreground text-center text-[10px]">No takers in this pool yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Category Expanded Content ────────────────────────────────────────────────
function CategoryPools({ category }: { category: CategoryRecord }) {
  // Determine which sub-tab to show
  const [activePoolTab, setActivePoolTab] = useState<"takers" | "leagues" | "sources">("takers");

  const hasTakers = category.has_taker_pool && category.category_type !== "hogmore";
  const hasSources = category.has_source_pool;
  // All categories with pools get a leagues section
  const hasLeagues = hasTakers || hasSources;

  const tabs = [
    ...(hasTakers ? [{ key: "takers" as const, label: "Takers" }] : []),
    ...(hasLeagues ? [{ key: "leagues" as const, label: "Leagues" }] : []),
    ...(hasSources ? [{ key: "sources" as const, label: "Sources" }] : []),
  ];

  // Default to first available tab
  const currentTab = tabs.find(t => t.key === activePoolTab) ? activePoolTab : tabs[0]?.key || "takers";

  return (
    <tr className="border-b border-border">
      <td colSpan={6} className="p-0">
        <div className="bg-muted/20 border-t border-border">
          {tabs.length > 1 && (
            <div className="flex gap-0.5 px-4 pt-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActivePoolTab(tab.key)}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-t transition-colors ${
                    currentTab === tab.key
                      ? "bg-card text-foreground border border-b-0 border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {currentTab === "takers" && hasTakers && (
            category.category_type === "mcr" ? <McrTakerPool category={category} /> : <AdvTakerPool category={category} />
          )}

          {currentTab === "leagues" && hasLeagues && (
            <SimplePool
              categoryId={category.id}
              title="Leagues"
              useData={useLeaguesByCategory}
              useUpsertHook={useUpsertLeague}
              useDeleteHook={useDeleteLeague}
              entityName="League"
            />
          )}

          {currentTab === "sources" && hasSources && (
            <SimplePool
              categoryId={category.id}
              title="Sources (Incoming Channels)"
              useData={useIncomingChannelsByCategory}
              useUpsertHook={useUpsertIncomingChannel}
              useDeleteHook={useDeleteIncomingChannel}
              entityName="Channel"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Categories Admin ────────────────────────────────────────────────────
export default function CategoriesAdmin() {
  const { data: rows = [] } = useCategories(false);
  const upsert = useUpsertCategory();
  const del = useDeleteCategory();

  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState({ name: "", type: "advanced", category_type: "custom", active: true, has_source_pool: false, has_taker_pool: true });

  const startNew = () => { setDraft({ name: "", type: "advanced", category_type: "custom", active: true, has_source_pool: false, has_taker_pool: true }); setEditing("new"); };
  const startEdit = (r: CategoryRecord) => {
    setDraft({ name: r.name, type: r.type, category_type: r.category_type || "adv", active: r.active, has_source_pool: r.has_source_pool ?? false, has_taker_pool: r.has_taker_pool ?? true });
    setEditing(r.id);
  };
  const save = () => {
    if (!draft.name.trim()) return;
    upsert.mutate({ id: editing === "new" ? undefined : editing!, ...draft });
    setEditing(null);
  };
  const cancel = () => setEditing(null);
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const canExpand = (r: CategoryRecord) => (r.has_taker_pool || r.has_source_pool) && r.category_type !== "hogmore";

  const CategoryFormRow = ({ isNew }: { isNew?: boolean }) => (
    <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
      <td className="px-2 py-1">
        <input autoFocus className="grid-cell-input border border-ring rounded" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Category name…" onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
      </td>
      <td className="px-2 py-1">
        <select className="grid-cell-input border border-border rounded" value={draft.category_type} onChange={(e) => setDraft({ ...draft, category_type: e.target.value })}>
          <option value="mcr">MCR</option>
          <option value="adv">ADV</option>
          <option value="hogmore">Hogmore</option>
          <option value="custom">Custom</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <select className="grid-cell-input border border-border rounded" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
          <option value="standard">Standard</option>
          <option value="advanced">Advanced</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={draft.has_taker_pool} onChange={(e) => setDraft({ ...draft, has_taker_pool: e.target.checked })} className="h-3 w-3 rounded border-border" />
            Taker Pool
          </label>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={draft.has_source_pool} onChange={(e) => setDraft({ ...draft, has_source_pool: e.target.checked })} className="h-3 w-3 rounded border-border" />
            Source Pool
          </label>
        </div>
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
        <h2 className="text-sm font-semibold">Categories & Pools</h2>
        <button onClick={startNew} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
          <Plus className="h-3.5 w-3.5" /> Add Category
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Name</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-24">Category Type</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-24">View Type</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-24">Pools</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Status</th>
            <th className="px-2 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && <CategoryFormRow isNew />}
          {rows.map((r) => (
            <React.Fragment key={r.id}>
              {editing === r.id ? (
                <CategoryFormRow />
              ) : (
                <tr className="border-b border-border last:border-b-0 group hover:bg-muted/30">
                  <td className="px-3 py-2">
                    {canExpand(r) ? (
                      <button onClick={() => toggle(r.id)} className="flex items-center gap-1 hover:text-primary">
                        {expanded[r.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {r.name}
                      </button>
                    ) : (
                      <span className="pl-4">{r.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${CATEGORY_TYPE_STYLES[r.category_type] || "bg-muted text-muted-foreground"}`}>
                      {CATEGORY_TYPE_LABELS[r.category_type] || r.category_type}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      r.type === "advanced" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {r.has_taker_pool && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">Taker</span>}
                      {r.has_source_pool && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">Source</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2"><ActiveBadge active={r.active} /></td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              )}
              {expanded[r.id] && editing !== r.id && canExpand(r) && (
                <CategoryPools category={r} />
              )}
            </React.Fragment>
          ))}
          {rows.length === 0 && editing !== "new" && (
            <tr><td colSpan={6} className="px-3 py-4 text-muted-foreground text-center">No categories yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

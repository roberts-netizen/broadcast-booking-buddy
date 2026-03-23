import React, { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  useCategories, useUpsertCategory, useDeleteCategory,
  useTakersByCategory, useUpsertCategoryTaker, useDeleteTaker,
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

// ── Taker Pool for a category ────────────────────────────────────────────────
const TAKER_FIELDS: { key: keyof TakerRecord; label: string; wide?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "protocol", label: "Protocol" },
  { key: "host", label: "Host" },
  { key: "stream_key", label: "Stream Key" },
  { key: "audio1", label: "Audio 1" },
  { key: "audio2", label: "Audio 2" },
  { key: "username", label: "Username" },
  { key: "password", label: "Password" },
  { key: "settings", label: "Settings", wide: true },
  { key: "email_subject", label: "Contact", wide: true },
];

function CategoryTakerPool({ category }: { category: CategoryRecord }) {
  const { data: takers = [] } = useTakersByCategory(category.id);
  const upsert = useUpsertCategoryTaker();
  const del = useDeleteTaker();

  const blankDraft: TakerRecord = { name: "", active: true };
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<TakerRecord>(blankDraft);

  const startNew = () => { setDraft(blankDraft); setEditing("new"); };
  const startEdit = (r: any) => {
    setDraft({
      id: r.id, name: r.name, active: r.active,
      protocol: r.protocol ?? "", host: r.host ?? "",
      stream_key: r.stream_key ?? "", audio1: r.audio1 ?? "",
      audio2: r.audio2 ?? "", username: r.username ?? "",
      password: r.password ?? "", settings: r.settings ?? "",
      email_subject: r.email_subject ?? "",
    });
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

  const TakerEditForm = () => (
    <tr className="border-b border-border bg-[hsl(var(--grid-row-editing))]">
      <td colSpan={7} className="px-3 py-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {TAKER_FIELDS.map((f) => (
            <div key={f.key} className={`flex items-center gap-2 ${f.wide ? "col-span-2" : ""}`}>
              <label className="text-[10px] text-muted-foreground w-20 shrink-0">{f.label}</label>
              <input
                className="grid-cell-input border border-border rounded flex-1 text-xs"
                type={f.key === "password" ? "password" : "text"}
                value={(draft[f.key] as string) ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
                autoFocus={f.key === "name"}
              />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground w-20 shrink-0">Status</label>
            <select className="grid-cell-input border border-border rounded text-xs" value={draft.active ? "1" : "0"} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.value === "1" }))}>
              <option value="1">Active</option><option value="0">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={save} className="text-[hsl(var(--confirmation-yes))] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <tr className="border-b border-border">
      <td colSpan={5} className="p-0">
        <div className="bg-muted/20 border-t border-border">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Taker Pool ({takers.length})</span>
            <button onClick={startNew} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium">
              <Plus className="h-3 w-3" /> Add Taker
            </button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-y border-border">
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">Name</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">Protocol</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">Host</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">Stream Key</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">Audio</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-16">Status</th>
                <th className="px-2 py-1.5 w-14"></th>
              </tr>
            </thead>
            <tbody>
              {editing === "new" && <TakerEditForm />}
              {takers.map((t: any) => (
                <React.Fragment key={t.id}>
                  {editing === t.id ? <TakerEditForm /> : (
                    <tr className="border-b border-border last:border-b-0 group hover:bg-muted/30">
                      <td className="px-3 py-1.5 font-medium">{t.name}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{t.protocol || "—"}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground truncate max-w-[150px]">{t.host || "—"}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{t.stream_key || "—"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{[t.audio1, t.audio2].filter(Boolean).join(", ") || "—"}</td>
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
                <tr><td colSpan={7} className="px-3 py-3 text-muted-foreground text-center text-[10px]">No takers in this pool yet.</td></tr>
              )}
            </tbody>
          </table>
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
  const [draft, setDraft] = useState({ name: "", type: "standard", category_type: "custom", active: true });

  const startNew = () => { setDraft({ name: "", type: "advanced", category_type: "custom", active: true }); setEditing("new"); };
  const startEdit = (r: CategoryRecord) => {
    setDraft({ name: r.name, type: r.type, category_type: r.category_type || "adv", active: r.active });
    setEditing(r.id);
  };
  const save = () => {
    if (!draft.name.trim()) return;
    upsert.mutate({ id: editing === "new" ? undefined : editing!, ...draft });
    setEditing(null);
  };
  const cancel = () => setEditing(null);
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const canExpand = (ct: string) => ct === "adv" || ct === "custom";

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Categories & Taker Pools</h2>
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
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Status</th>
            <th className="px-2 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {editing === "new" && (
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
            <React.Fragment key={r.id}>
              <tr className="border-b border-border last:border-b-0 group hover:bg-muted/30">
                {editing === r.id ? (
                  <>
                    <td className="px-2 py-1">
                      <input autoFocus className="grid-cell-input border border-ring rounded" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />
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
                      {canExpand(r.category_type) ? (
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
              {expanded[r.id] && editing !== r.id && canExpand(r.category_type) && (
                <CategoryTakerPool category={r} />
              )}
            </React.Fragment>
          ))}
          {rows.length === 0 && editing !== "new" && (
            <tr><td colSpan={5} className="px-3 py-4 text-muted-foreground text-center">No categories yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

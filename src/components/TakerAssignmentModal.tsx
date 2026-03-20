import React, { useState, useEffect } from "react";
import { X, Plus, AlertTriangle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  TakerAssignment,
  TestStatus,
  useCreateTakerAssignment,
  useUpdateTakerAssignment,
  useDeleteTakerAssignment,
} from "@/hooks/useTakerAssignments";
import { useUpsertTaker } from "@/hooks/useLookups";

const PROTOCOLS = ["SRT Pull", "SRT Push", "RTMP", "RTP", "Other"];
const QUALITIES = ["1080p50", "1080i50", "720p50", "Custom"];
const COMM_METHODS = ["WhatsApp", "Email", "Both", "Other"];
const TEST_STATUSES: { value: TestStatus; label: string; dot: string }[] = [
  { value: "not_tested", label: "Not Tested", dot: "🔴" },
  { value: "waiting_for_details", label: "Waiting for details", dot: "🟡" },
  { value: "tested", label: "Tested", dot: "🟢" },
];

type Taker = { id: string; name: string };

type AssignmentFormState = Partial<TakerAssignment> & {
  _newTakerName?: string;
  _isCreatingTaker?: boolean;
};

function fieldClass(warn?: boolean) {
  return `w-full border rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring ${
    warn ? "border-yellow-400" : "border-input"
  }`;
}

function Label({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <label className={`text-[10px] font-medium uppercase tracking-wide block mb-0.5 ${warn ? "text-yellow-600" : "text-muted-foreground"}`}>
      {children}
    </label>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-0.5 mb-2 mt-3">
      {children}
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1 text-yellow-600 text-[10px] mt-0.5">
      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
      {text}
    </div>
  );
}

type AssignmentFormProps = {
  form: AssignmentFormState;
  takers: Taker[];
  onChange: (patch: Partial<AssignmentFormState>) => void;
  onSave: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  isNew: boolean;
};

function AssignmentForm({ form, takers, onChange, onSave, onDelete, isSaving, isNew }: AssignmentFormProps) {
  const [expanded, setExpanded] = useState(isNew);

  const needsHost = !!form.protocol && form.protocol !== "Other";
  const missingProtocol = !form.protocol;
  const missingHost = needsHost && !form.host;
  const missingPort = needsHost && !form.port;
  const hasWarnings = missingProtocol || missingHost || missingPort;

  const takerName = form._isCreatingTaker
    ? (form._newTakerName || "")
    : (takers.find((t) => t.id === form.taker_id)?.name ?? "");

  const statusMeta = TEST_STATUSES.find((s) => s.value === form.test_status) ?? TEST_STATUSES[0];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* ── Collapsed header ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-sm">{statusMeta.dot}</span>
        <span className="font-medium text-xs flex-1 truncate">
          {takerName || <span className="text-muted-foreground italic">New assignment</span>}
        </span>
        {form.protocol && (
          <span className="text-[10px] bg-secondary rounded px-1.5 py-0.5 text-secondary-foreground">{form.protocol}</span>
        )}
        {form.quality && (
          <span className="text-[10px] bg-secondary rounded px-1.5 py-0.5 text-secondary-foreground">{form.quality}</span>
        )}
        {hasWarnings && <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>

      {/* ── Expanded form ── */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-0.5">
          <SectionHeader>A. Taker</SectionHeader>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <Label>Taker Name</Label>
              <SearchableSelect
                freeText
                options={takers.map((t) => ({ value: t.id, label: t.name }))}
                value={form._isCreatingTaker ? "" : (form.taker_id ?? "")}
                onChange={(val) => {
                  const isExistingId = takers.some((t) => t.id === val);
                  if (!val) {
                    onChange({ taker_id: null, _isCreatingTaker: false, _newTakerName: "" });
                  } else if (isExistingId) {
                    onChange({ taker_id: val, _isCreatingTaker: false, _newTakerName: "" });
                  } else {
                    onChange({ _isCreatingTaker: true, taker_id: null, _newTakerName: val });
                  }
                }}
                placeholder="— select or type —"
              />
            </div>
          </div>

          <SectionHeader>B. Technical Details</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label warn={missingProtocol}>Protocol {missingProtocol && "⚠"}</Label>
              <SearchableSelect
                freeText
                options={PROTOCOLS.map((p) => ({ value: p, label: p }))}
                value={form.protocol ?? ""}
                onChange={(val) => onChange({ protocol: val || null })}
                placeholder="— select —"
              />
              {missingProtocol && <Warning text="Protocol is missing" />}
            </div>
            <div>
              <Label>Quality</Label>
              <select
                className={fieldClass()}
                value={form.quality ?? ""}
                onChange={(e) => onChange({ quality: e.target.value || null })}
              >
                <option value="">— select —</option>
                {QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <Label warn={missingHost}>Host / IP {missingHost && "⚠"}</Label>
              <input
                className={fieldClass(missingHost)}
                placeholder="e.g. 192.168.1.1"
                value={form.host ?? ""}
                onChange={(e) => onChange({ host: e.target.value || null })}
              />
              {missingHost && <Warning text="Host/IP required for this protocol" />}
            </div>
            <div>
              <Label warn={missingPort}>Port {missingPort && "⚠"}</Label>
              <input
                className={fieldClass(missingPort)}
                placeholder="e.g. 9000"
                value={form.port ?? ""}
                onChange={(e) => onChange({ port: e.target.value || null })}
              />
              {missingPort && <Warning text="Port required for this protocol" />}
            </div>
            <div className="col-span-2">
              <Label>Stream Key / Channel ID</Label>
              <input
                className={fieldClass()}
                placeholder="Stream key or channel ID…"
                value={form.stream_key_or_channel_id ?? ""}
                onChange={(e) => onChange({ stream_key_or_channel_id: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Username</Label>
              <input
                className={fieldClass()}
                placeholder="optional"
                value={form.username ?? ""}
                onChange={(e) => onChange({ username: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Password</Label>
              <input
                type="password"
                className={fieldClass()}
                placeholder="optional"
                value={form.password ?? ""}
                onChange={(e) => onChange({ password: e.target.value || null })}
              />
            </div>
            <div className="col-span-2">
              <Label>Requested Audio</Label>
              <input
                className={fieldClass()}
                placeholder="e.g. Stereo, 5.1…"
                value={form.audio ?? ""}
                onChange={(e) => onChange({ audio: e.target.value || null })}
              />
            </div>
          </div>

          <SectionHeader>C. Communication</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Method</Label>
              <select
                className={fieldClass()}
                value={form.communication_method ?? ""}
                onChange={(e) => onChange({ communication_method: e.target.value || null })}
              >
                <option value="">— select —</option>
                {COMM_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label>WhatsApp Details</Label>
              <input
                className={fieldClass()}
                placeholder="+1234… / contact"
                value={form.whatsapp_details ?? ""}
                onChange={(e) => onChange({ whatsapp_details: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Email Subject</Label>
              <input
                className={fieldClass()}
                placeholder="Subject…"
                value={form.email_subject ?? ""}
                onChange={(e) => onChange({ email_subject: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Tested By</Label>
              <input
                className={fieldClass()}
                placeholder="Operator name"
                value={form.tested_by ?? ""}
                onChange={(e) => onChange({ tested_by: e.target.value || null })}
              />
            </div>
            <div className="col-span-2">
              <Label>Communication Notes</Label>
              <Textarea
                className="text-xs min-h-[50px]"
                placeholder="Notes…"
                value={form.communication_notes ?? ""}
                onChange={(e) => onChange({ communication_notes: e.target.value || null })}
              />
            </div>
          </div>

          <SectionHeader>D. Testing</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Test Status</Label>
              <select
                className={fieldClass()}
                value={form.test_status ?? "not_tested"}
                onChange={(e) => onChange({ test_status: e.target.value as TestStatus })}
              >
                {TEST_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.dot} {s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Test Date/Time</Label>
              <input
                type="datetime-local"
                className={fieldClass()}
                value={form.test_datetime ? form.test_datetime.slice(0, 16) : ""}
                onChange={(e) => onChange({ test_datetime: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
            <div className="col-span-2">
              <Label>Test Notes</Label>
              <Textarea
                className="text-xs min-h-[50px]"
                placeholder="Test notes…"
                value={form.test_notes ?? ""}
                onChange={(e) => onChange({ test_notes: e.target.value || null })}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between pt-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-[11px] text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            )}
            <div className="ml-auto">
              <Button size="sm" onClick={onSave} disabled={isSaving} className="h-7 text-xs">
                {isSaving ? "Saving…" : isNew ? "Add Assignment" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingLabel: string;
  assignments: TakerAssignment[];
  takers: Taker[];
};

const EMPTY_FORM: AssignmentFormState = {
  test_status: "not_tested",
  _isCreatingTaker: false,
  _newTakerName: "",
};

export function TakerAssignmentModal({ open, onClose, bookingId, bookingLabel, assignments, takers }: Props) {
  const createAssignment = useCreateTakerAssignment();
  const updateAssignment = useUpdateTakerAssignment();
  const deleteAssignment = useDeleteTakerAssignment();
  const upsertTaker = useUpsertTaker();

  // per-assignment edit state (id -> form state)
  const [editForms, setEditForms] = useState<Record<string, AssignmentFormState>>({});
  const [newForm, setNewForm] = useState<AssignmentFormState>({ ...EMPTY_FORM });
  const [showNew, setShowNew] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Sync edit forms when assignments change
  useEffect(() => {
    setEditForms((prev) => {
      const next: Record<string, AssignmentFormState> = {};
      for (const a of assignments) {
        next[a.id] = prev[a.id] ?? { ...a };
      }
      return next;
    });
  }, [assignments]);

  const patchEdit = (id: string, patch: Partial<AssignmentFormState>) => {
    setEditForms((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const resolveOrCreateTaker = async (form: AssignmentFormState): Promise<string | null> => {
    if (form._isCreatingTaker && form._newTakerName?.trim()) {
      // Create new taker
      const name = form._newTakerName.trim();
      const { data, error } = await (supabase as any)
        .from("takers")
        .insert({ name, active: true })
        .select()
        .single();
      if (error) throw error;
      return data.id as string;
    }
    return form.taker_id ?? null;
  };

  const handleSaveExisting = async (id: string) => {
    const form = editForms[id];
    if (!form) return;
    setSavingIds((prev) => new Set(prev).add(id));
    try {
      const takerId = await resolveOrCreateTaker(form);
      await updateAssignment.mutateAsync({
        id,
        taker_id: takerId,
        protocol: form.protocol,
        host: form.host,
        port: form.port,
        stream_key_or_channel_id: form.stream_key_or_channel_id,
        username: form.username,
        password: form.password,
        quality: form.quality,
        audio: form.audio,
        communication_method: form.communication_method,
        whatsapp_details: form.whatsapp_details,
        email_subject: form.email_subject,
        communication_notes: form.communication_notes,
        test_datetime: form.test_datetime,
        test_status: form.test_status ?? "not_tested",
        test_notes: form.test_notes,
        tested_by: form.tested_by,
      });
    } finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleDeleteExisting = async (id: string) => {
    await deleteAssignment.mutateAsync(id);
  };

  const handleSaveNew = async () => {
    setSavingIds((prev) => new Set(prev).add("__new__"));
    try {
      const takerId = await resolveOrCreateTaker(newForm);
      await createAssignment.mutateAsync({
        booking_id: bookingId,
        taker_id: takerId,
        protocol: newForm.protocol,
        host: newForm.host,
        port: newForm.port,
        stream_key_or_channel_id: newForm.stream_key_or_channel_id,
        username: newForm.username,
        password: newForm.password,
        quality: newForm.quality,
        audio: newForm.audio,
        communication_method: newForm.communication_method,
        whatsapp_details: newForm.whatsapp_details,
        email_subject: newForm.email_subject,
        communication_notes: newForm.communication_notes,
        test_datetime: newForm.test_datetime,
        test_status: newForm.test_status ?? "not_tested",
        test_notes: newForm.test_notes,
        tested_by: newForm.tested_by,
        sort_order: assignments.length,
      });
      setNewForm({ ...EMPTY_FORM });
      setShowNew(false);
    } finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete("__new__"); return s; });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Taker Assignments — <span className="text-muted-foreground font-normal">{bookingLabel}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {assignments.length === 0 && !showNew && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No taker assignments yet.
            </p>
          )}

          {/* Existing assignments */}
          {assignments.map((a) => (
            <AssignmentForm
              key={a.id}
              form={editForms[a.id] ?? { ...a }}
              takers={takers}
              onChange={(patch) => patchEdit(a.id, patch)}
              onSave={() => handleSaveExisting(a.id)}
              onDelete={() => handleDeleteExisting(a.id)}
              isSaving={savingIds.has(a.id)}
              isNew={false}
            />
          ))}

          {/* New form */}
          {showNew && (
            <AssignmentForm
              form={newForm}
              takers={takers}
              onChange={(patch) => setNewForm((prev) => ({ ...prev, ...patch }))}
              onSave={handleSaveNew}
              isSaving={savingIds.has("__new__")}
              isNew={true}
            />
          )}

          {/* Add button */}
          <button
            onClick={() => { setNewForm({ ...EMPTY_FORM }); setShowNew(true); }}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors w-full justify-center border border-dashed border-border rounded py-2 hover:bg-muted/40"
          >
            <Plus className="h-3.5 w-3.5" /> Add Taker Assignment
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// need supabase for inline taker creation
import { supabase } from "@/integrations/supabase/client";

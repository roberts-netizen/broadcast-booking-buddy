import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertTriangle,
  Save,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Booking, useUpdateBooking } from "@/hooks/useBookings";
import {
  TakerAssignment,
  TestStatus,
  useTakerAssignments,
  useCreateTakerAssignment,
  useUpdateTakerAssignment,
  useDeleteTakerAssignment,
} from "@/hooks/useTakerAssignments";
import {
  ProjectTakerEndpoint,
  useProjectTakerEndpoints,
  useUpsertEndpoint,
  useDeleteEndpoint,
} from "@/hooks/useProjectTakerEndpoints";
import { useTakers } from "@/hooks/useLookups";

const PROTOCOLS = ["SRT Pull", "SRT Push", "RTMP", "RTP", "TCP", "Other"];
const QUALITIES = ["1080p50", "1080i50", "720p50", "Custom"];
const COMM_METHODS = ["WhatsApp", "Email", "Both", "Other"];
const TEST_STATUSES: { value: TestStatus; label: string; color: string }[] = [
  { value: "not_tested", label: "Not Tested", color: "bg-red-500/20 text-red-400" },
  { value: "scheduled", label: "Scheduled", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "tested", label: "Tested", color: "bg-green-500/20 text-green-400" },
  { value: "failed", label: "Failed", color: "bg-orange-500/20 text-orange-400" },
];

function fieldClass() {
  return "w-full border border-input rounded px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring";
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-[10px] font-medium uppercase tracking-wide block mb-0.5 text-muted-foreground ${className}`}>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-1 mb-3 mt-4 first:mt-0">
      {children}
    </div>
  );
}

// ── Endpoint Block ───────────────────────────────────────────────────────────
function EndpointBlock({
  type,
  endpoint,
  onChange,
}: {
  type: "primary" | "backup";
  endpoint: Partial<ProjectTakerEndpoint>;
  onChange: (patch: Partial<ProjectTakerEndpoint>) => void;
}) {
  const isPrimary = type === "primary";
  return (
    <div className={`border rounded-lg p-3 space-y-2 ${isPrimary ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {isPrimary ? (
          <Shield className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {isPrimary ? "Primary Endpoint" : "Backup Endpoint"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Protocol</Label>
          <select className={fieldClass()} value={endpoint.protocol ?? ""} onChange={(e) => onChange({ protocol: e.target.value || null })}>
            <option value="">— select —</option>
            {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <Label>Host / IP</Label>
          <input className={fieldClass()} placeholder="192.168.1.1" value={endpoint.host ?? ""} onChange={(e) => onChange({ host: e.target.value || null })} />
        </div>
        <div>
          <Label>Port</Label>
          <input className={fieldClass()} placeholder="9000" value={endpoint.port ?? ""} onChange={(e) => onChange({ port: e.target.value || null })} />
        </div>
        <div>
          <Label>Stream Key</Label>
          <input className={fieldClass()} placeholder="stream key…" value={endpoint.stream_key ?? ""} onChange={(e) => onChange({ stream_key: e.target.value || null })} />
        </div>
        <div>
          <Label>Username</Label>
          <input className={fieldClass()} placeholder="optional" value={endpoint.username ?? ""} onChange={(e) => onChange({ username: e.target.value || null })} />
        </div>
        <div>
          <Label>Password</Label>
          <input type="password" className={fieldClass()} placeholder="optional" value={endpoint.password ?? ""} onChange={(e) => onChange({ password: e.target.value || null })} />
        </div>
      </div>
    </div>
  );
}

// ── Taker Block ──────────────────────────────────────────────────────────────
function TakerBlock({
  assignment,
  takers,
  primaryEndpoint,
  backupEndpoint,
  onUpdateAssignment,
  onUpdateEndpoint,
  onDelete,
  bookingDate,
}: {
  assignment: TakerAssignment;
  takers: { id: string; name: string }[];
  primaryEndpoint: Partial<ProjectTakerEndpoint>;
  backupEndpoint: Partial<ProjectTakerEndpoint>;
  onUpdateAssignment: (patch: Partial<TakerAssignment>) => void;
  onUpdateEndpoint: (type: "primary" | "backup", patch: Partial<ProjectTakerEndpoint>) => void;
  onDelete: () => void;
  bookingDate: string;
}) {
  const [expanded, setExpanded] = useState(true);

  const takerName = takers.find((t) => t.id === assignment.taker_id)?.name ?? "";
  const statusMeta = TEST_STATUSES.find((s) => s.value === assignment.test_status) ?? TEST_STATUSES[0];

  // Highlight if not tested and event within 24h
  const isUrgent = useMemo(() => {
    if (assignment.test_status !== "not_tested") return false;
    const eventDate = new Date(bookingDate);
    const now = new Date();
    const diff = eventDate.getTime() - now.getTime();
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
  }, [assignment.test_status, bookingDate]);

  return (
    <div className={`border rounded-lg overflow-hidden ${isUrgent ? "border-red-500 bg-red-500/5" : "border-border"}`}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusMeta.color}`}>
          {statusMeta.label}
        </span>
        <span className="font-medium text-xs flex-1 truncate">
          {takerName || <span className="text-muted-foreground italic">Unassigned</span>}
        </span>
        {isUrgent && <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />}
        {assignment.quality && (
          <span className="text-[10px] bg-secondary rounded px-1.5 py-0.5 text-secondary-foreground">{assignment.quality}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-muted-foreground hover:text-destructive p-0.5"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-1">
          {/* A. Communication */}
          <SectionTitle>A. Communication</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Taker Name</Label>
              <select className={fieldClass()} value={assignment.taker_id ?? ""} onChange={(e) => onUpdateAssignment({ taker_id: e.target.value || null })}>
                <option value="">— select —</option>
                {takers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Communication Platform</Label>
              <select className={fieldClass()} value={assignment.communication_method ?? ""} onChange={(e) => onUpdateAssignment({ communication_method: e.target.value || null })}>
                <option value="">— select —</option>
                {COMM_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label>Email Subject</Label>
              <input className={fieldClass()} placeholder="Subject…" value={assignment.email_subject ?? ""} onChange={(e) => onUpdateAssignment({ email_subject: e.target.value || null })} />
            </div>
            <div>
              <Label>Phone Number</Label>
              <input className={fieldClass()} placeholder="+1234…" value={(assignment as any).phone_number ?? ""} onChange={(e) => onUpdateAssignment({ phone_number: e.target.value || null } as any)} />
            </div>
            <div>
              <Label>Requested Quality</Label>
              <select className={fieldClass()} value={assignment.quality ?? ""} onChange={(e) => onUpdateAssignment({ quality: e.target.value || null })}>
                <option value="">— select —</option>
                {QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <Label>Requested Audio</Label>
              <input className={fieldClass()} placeholder="e.g. Stereo, 5.1…" value={assignment.audio ?? ""} onChange={(e) => onUpdateAssignment({ audio: e.target.value || null })} />
            </div>
          </div>

          {/* Test tracking */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div>
              <Label>Test Status</Label>
              <select className={fieldClass()} value={assignment.test_status} onChange={(e) => onUpdateAssignment({ test_status: e.target.value as TestStatus })}>
                {TEST_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Test Date/Time</Label>
              <input type="datetime-local" className={fieldClass()} value={assignment.test_datetime ? assignment.test_datetime.slice(0, 16) : ""} onChange={(e) => onUpdateAssignment({ test_datetime: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <div>
              <Label>Tested By</Label>
              <input className={fieldClass()} placeholder="Operator" value={assignment.tested_by ?? ""} onChange={(e) => onUpdateAssignment({ tested_by: e.target.value || null })} />
            </div>
          </div>

          <div className="mt-2">
            <Label>Notes</Label>
            <Textarea className="text-xs min-h-[40px]" placeholder="Notes…" value={assignment.communication_notes ?? ""} onChange={(e) => onUpdateAssignment({ communication_notes: e.target.value || null })} />
          </div>

          {/* B. Primary Endpoint */}
          <SectionTitle>B. Primary Endpoint</SectionTitle>
          <EndpointBlock type="primary" endpoint={primaryEndpoint} onChange={(patch) => onUpdateEndpoint("primary", patch)} />

          {/* C. Backup Endpoint */}
          <SectionTitle>C. Backup Endpoint (Optional)</SectionTitle>
          <EndpointBlock type="backup" endpoint={backupEndpoint} onChange={(patch) => onUpdateEndpoint("backup", patch)} />
        </div>
      )}
    </div>
  );
}

// ── Main Advanced Booking View ───────────────────────────────────────────────
type Props = {
  booking: Booking;
  onBack: () => void;
};

export function AdvancedBookingView({ booking, onBack }: Props) {
  const updateBooking = useUpdateBooking();
  const { data: takers = [] } = useTakers(true);
  const { data: assignments = [] } = useTakerAssignments([booking.id]);
  const assignmentIds = useMemo(() => assignments.map((a) => a.id), [assignments]);
  const { data: endpoints = [] } = useProjectTakerEndpoints(assignmentIds);

  const createAssignment = useCreateTakerAssignment();
  const updateAssignment = useUpdateTakerAssignment();
  const deleteAssignment = useDeleteTakerAssignment();
  const upsertEndpoint = useUpsertEndpoint();

  // Local event-level state
  const [eventForm, setEventForm] = useState({
    event_name: booking.event_name ?? "",
    date: booking.date ?? "",
    cet_time: booking.cet_time ?? "",
    venue: (booking as any).venue ?? "",
    source: (booking as any).source ?? "",
    project_lead: (booking as any).project_lead ?? "",
    audio_setup: (booking as any).audio_setup ?? "",
    event_notes: (booking as any).event_notes ?? "",
  });

  // Local endpoint drafts
  const [endpointDrafts, setEndpointDrafts] = useState<Record<string, Partial<ProjectTakerEndpoint>>>({});

  // Build endpoint map: `${assignmentId}_${type}` -> endpoint
  const endpointMap = useMemo(() => {
    const map: Record<string, ProjectTakerEndpoint> = {};
    for (const ep of endpoints) {
      map[`${ep.taker_assignment_id}_${ep.endpoint_type}`] = ep;
    }
    return map;
  }, [endpoints]);

  const getEndpoint = (assignmentId: string, type: "primary" | "backup"): Partial<ProjectTakerEndpoint> => {
    const key = `${assignmentId}_${type}`;
    return endpointDrafts[key] ?? endpointMap[key] ?? {};
  };

  const handleSaveEvent = useCallback(() => {
    updateBooking.mutate({
      id: booking.id,
      event_name: eventForm.event_name,
      date: eventForm.date,
      cet_time: eventForm.cet_time || null,
      venue: eventForm.venue || null,
      source: eventForm.source || null,
      project_lead: eventForm.project_lead || null,
      audio_setup: eventForm.audio_setup || null,
      event_notes: eventForm.event_notes || null,
    } as any);
  }, [booking.id, eventForm, updateBooking]);

  const handleUpdateAssignment = useCallback((id: string, patch: Partial<TakerAssignment>) => {
    const { taker_name, ...rest } = patch as any;
    updateAssignment.mutate({ id, ...rest });
  }, [updateAssignment]);

  const handleUpdateEndpoint = useCallback((assignmentId: string, type: "primary" | "backup", patch: Partial<ProjectTakerEndpoint>) => {
    const key = `${assignmentId}_${type}`;
    const current = endpointDrafts[key] ?? endpointMap[key] ?? {};
    const updated = { ...current, ...patch };
    setEndpointDrafts((prev) => ({ ...prev, [key]: updated }));
    // Auto-save endpoint
    upsertEndpoint.mutate({
      taker_assignment_id: assignmentId,
      endpoint_type: type,
      protocol: updated.protocol ?? null,
      host: updated.host ?? null,
      port: updated.port ?? null,
      stream_key: updated.stream_key ?? null,
      username: updated.username ?? null,
      password: updated.password ?? null,
    });
  }, [endpointDrafts, endpointMap, upsertEndpoint]);

  const handleAddTaker = useCallback(() => {
    createAssignment.mutate({
      booking_id: booking.id,
      test_status: "not_tested",
    });
  }, [booking.id, createAssignment]);

  const takerList = useMemo(() => takers.map((t: any) => ({ id: t.id, name: t.name })), [takers]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
        <h1 className="text-sm font-bold truncate flex-1">{eventForm.event_name || "Advanced Project"}</h1>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveEvent} disabled={updateBooking.isPending}>
          <Save className="h-3 w-3" />
          Save Event
        </Button>
      </div>

      {/* Split layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Event info */}
        <div className="w-[380px] shrink-0 border-r border-border overflow-y-auto p-4 space-y-3">
          <SectionTitle>Event Information</SectionTitle>
          <div className="space-y-2">
            <div>
              <Label>Event Name</Label>
              <input className={fieldClass()} value={eventForm.event_name} onChange={(e) => setEventForm((f) => ({ ...f, event_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <input type="date" className={fieldClass()} value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Time (CET)</Label>
                <input type="time" className={fieldClass()} value={eventForm.cet_time?.slice(0, 5) ?? ""} onChange={(e) => setEventForm((f) => ({ ...f, cet_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Venue</Label>
              <input className={fieldClass()} placeholder="Venue name…" value={eventForm.venue} onChange={(e) => setEventForm((f) => ({ ...f, venue: e.target.value }))} />
            </div>
            <div>
              <Label>Source</Label>
              <input className={fieldClass()} placeholder="Source…" value={eventForm.source} onChange={(e) => setEventForm((f) => ({ ...f, source: e.target.value }))} />
            </div>
            <div>
              <Label>Project Lead</Label>
              <input className={fieldClass()} placeholder="Lead name…" value={eventForm.project_lead} onChange={(e) => setEventForm((f) => ({ ...f, project_lead: e.target.value }))} />
            </div>
          </div>

          <SectionTitle>Overall Audio Setup</SectionTitle>
          <Textarea
            className="text-xs min-h-[120px] font-mono"
            placeholder={"CH12:\nCH34:\nCH56:\nCH78:"}
            value={eventForm.audio_setup}
            onChange={(e) => setEventForm((f) => ({ ...f, audio_setup: e.target.value }))}
          />

          <SectionTitle>Event Notes</SectionTitle>
          <Textarea
            className="text-xs min-h-[80px]"
            placeholder="General notes…"
            value={eventForm.event_notes}
            onChange={(e) => setEventForm((f) => ({ ...f, event_notes: e.target.value }))}
          />
        </div>

        {/* RIGHT: Taker blocks */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Taker Assignments ({assignments.length})</SectionTitle>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddTaker}>
              <Plus className="h-3 w-3" /> Add Taker
            </Button>
          </div>

          {assignments.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No takers assigned yet. Click "Add Taker" to begin.
            </div>
          )}

          {assignments.map((a) => (
            <TakerBlock
              key={a.id}
              assignment={a}
              takers={takerList}
              primaryEndpoint={getEndpoint(a.id, "primary")}
              backupEndpoint={getEndpoint(a.id, "backup")}
              onUpdateAssignment={(patch) => handleUpdateAssignment(a.id, patch)}
              onUpdateEndpoint={(type, patch) => handleUpdateEndpoint(a.id, type, patch)}
              onDelete={() => deleteAssignment.mutate(a.id)}
              bookingDate={booking.date}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

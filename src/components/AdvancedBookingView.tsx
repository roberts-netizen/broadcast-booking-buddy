import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SearchableSelect } from "./SearchableSelect";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/hooks/useProjectTakerEndpoints";
import { useTakers } from "@/hooks/useLookups";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

const PROTOCOLS = ["RTMP", "SRT", "TCP", "Bifrost", "SRT Pull", "RTMP 2", "SRT 2", "TCP 2", "Bifrost 2", "SRT Pull 2"];
const SOURCES_UNUSED = null; // removed
const COMM_METHODS = ["WhatsApp", "Email", "Both", "Other"];
const TEST_STATUSES: { value: TestStatus; label: string; color: string }[] = [
  { value: "not_tested", label: "Not Tested", color: "text-destructive bg-destructive/10" },
  { value: "waiting_for_details", label: "Waiting for details", color: "text-yellow-600 bg-yellow-500/10" },
  { value: "tested", label: "Tested", color: "text-green-600 bg-green-500/10" },
];

const cellBase = "px-2 py-1.5 border-b border-r border-border text-xs";
const inputClass = "w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 hover:bg-muted/30 focus:bg-muted/40 focus:ring-1 focus:ring-ring rounded px-1 py-0.5 cursor-text";
const selectClass = "w-full bg-transparent text-xs outline-none cursor-pointer";
const headerCell = "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border bg-muted/50";
const labelCell = `${cellBase} bg-muted/30 font-medium text-muted-foreground whitespace-nowrap min-w-[160px]`;
const eventLabelCell = `${cellBase} font-semibold text-foreground bg-card whitespace-nowrap`;
const eventValueCell = `${cellBase} bg-card`;

const DEFAULT_TAKER_COUNT = 3;

type Props = {
  booking: Booking;
};

export function AdvancedBookingView({ booking }: Props) {
  const updateBooking = useUpdateBooking();
  const { data: takers = [] } = useTakers(true);
  const { data: assignments = [], isLoading: assignmentsLoading } = useTakerAssignments([booking.id]);
  const assignmentIds = useMemo(() => assignments.map((a) => a.id), [assignments]);
  const { data: endpoints = [] } = useProjectTakerEndpoints(assignmentIds);

  const createAssignment = useCreateTakerAssignment();
  const updateAssignment = useUpdateTakerAssignment();
  const deleteAssignment = useDeleteTakerAssignment();
  const upsertEndpoint = useUpsertEndpoint();

  // Track "save as permanent" checkbox per assignment
  const [savePermanent, setSavePermanent] = useState<Record<string, boolean>>({});

  // Local state for text inputs to avoid per-keystroke DB writes
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const getLocal = (key: string, serverVal: string) =>
    key in localValues ? localValues[key] : serverVal;
  const setLocal = (key: string, val: string) =>
    setLocalValues((prev) => ({ ...prev, [key]: val }));
  const flushLocal = (key: string, id: string, field: string, isEndpoint?: { assignmentId: string; type: "primary" | "backup" }) => {
    if (!(key in localValues)) return;
    const val = localValues[key] || null;
    if (isEndpoint) {
      handleUpdateEndpoint(isEndpoint.assignmentId, isEndpoint.type, { [field]: val } as any);
    } else {
      handleUpdateAssignment(id, { [field]: val } as any);
    }
    setLocalValues((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  // Auto-create default 3 takers
  const hasAutoCreated = useRef(false);
  useEffect(() => {
    if (assignmentsLoading || hasAutoCreated.current) return;
    if (assignments.length < DEFAULT_TAKER_COUNT) {
      hasAutoCreated.current = true;
      const toCreate = DEFAULT_TAKER_COUNT - assignments.length;
      for (let i = 0; i < toCreate; i++) {
        createAssignment.mutate({ booking_id: booking.id, test_status: "not_tested", sort_order: assignments.length + i });
      }
    }
  }, [assignmentsLoading, assignments.length, booking.id]);

  // Local event state
  const [ef, setEf] = useState({
    event_name: booking.event_name ?? "",
    date: booking.date ?? "",
    date_to: (booking as any).date_to ?? "",
    cet_time: booking.cet_time ?? "",
    cet_time_to: (booking as any).cet_time_to ?? "",
    venue: (booking as any).venue ?? "",
    source: (booking as any).source ?? "",
    source_status: (booking as any).source_status ?? "not_tested",
    audio_setup: (booking as any).audio_setup ?? "CH12:\nCH34:\nCH56:\nCH78:",
    project_lead: (booking as any).project_lead ?? "",
    event_notes: (booking as any).event_notes ?? "",
  });

  // Endpoint map
  const endpointMap = useMemo(() => {
    const map: Record<string, ProjectTakerEndpoint> = {};
    for (const ep of endpoints) map[`${ep.taker_assignment_id}_${ep.endpoint_type}`] = ep;
    return map;
  }, [endpoints]);

  const getEp = (aId: string, type: "primary" | "backup"): Partial<ProjectTakerEndpoint> =>
    endpointMap[`${aId}_${type}`] ?? {};

  // Autosave event on Enter
  const saveEvent = useCallback(() => {
    updateBooking.mutate({
      id: booking.id,
      event_name: ef.event_name,
      date: ef.date,
      date_to: ef.date_to || null,
      cet_time: ef.cet_time || null,
      cet_time_to: ef.cet_time_to || null,
      venue: ef.venue || null,
      source: ef.source || null,
      project_lead: ef.project_lead || null,
      audio_setup: ef.audio_setup || null,
      event_notes: ef.event_notes || null,
    } as any);
  }, [booking.id, ef, updateBooking]);

  const handleEventKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEvent();
    }
  }, [saveEvent]);

  // Also save on blur for event fields
  const handleEventBlur = useCallback(() => {
    saveEvent();
  }, [saveEvent]);

  const handleUpdateAssignment = useCallback(
    (id: string, patch: Partial<TakerAssignment>) => {
      const { taker_name, ...rest } = patch as any;
      updateAssignment.mutate({ id, ...rest });
    },
    [updateAssignment]
  );

  const handleUpdateEndpoint = useCallback(
    (assignmentId: string, type: "primary" | "backup", patch: Partial<ProjectTakerEndpoint>) => {
      const current = endpointMap[`${assignmentId}_${type}`] ?? {};
      const updated = { ...current, ...patch };
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
    },
    [endpointMap, upsertEndpoint]
  );

  const handleAddTaker = useCallback(() => {
    createAssignment.mutate({ booking_id: booking.id, test_status: "not_tested", sort_order: assignments.length });
  }, [booking.id, createAssignment, assignments.length]);

  const takerList = useMemo(() => takers.map((t: any) => ({ id: t.id, name: t.name })), [takers]);

  // Taker columns (minimum 3 displayed)
  const displayCount = Math.max(DEFAULT_TAKER_COUNT, assignments.length);
  const takerCols = Array.from({ length: displayCount }, (_, i) => assignments[i] ?? null);

  // Info rows definition
  const infoRows: {
    label: string;
    render: (a: TakerAssignment | null, idx: number) => React.ReactNode;
  }[] = [
    {
      label: "Taker Name:",
      render: (a) => {
        if (!a) return null;
        const customName = (a as any).taker_custom_name ?? "";
        const isPermanentChecked = savePermanent[a.id] ?? false;

        const handleSavePermanent = async (name: string) => {
          if (!name.trim()) return;
          // Gather endpoint data for this assignment
          const primaryEp = getEp(a.id, "primary");
          const backupEp = getEp(a.id, "backup");
          const { data, error } = await supabase
            .from("takers")
            .insert({
              name: name.trim(),
              active: true,
              email_subject: a.email_subject || null,
              communication_method: a.communication_method || null,
              phone_number: (a as any).phone_number || null,
              quality: a.quality || null,
              audio: a.audio || null,
              protocol: primaryEp.protocol || null,
              host: primaryEp.host || null,
              port: primaryEp.port || null,
              stream_key: primaryEp.stream_key || null,
              username: primaryEp.username || null,
              password: primaryEp.password || null,
              backup_host: backupEp.host || null,
              backup_port: backupEp.port || null,
              backup_stream_key: backupEp.stream_key || null,
              backup_username: backupEp.username || null,
              backup_password: backupEp.password || null,
            })
            .select()
            .single();
          if (error || !data) return;
          handleUpdateAssignment(a.id, { taker_id: data.id, taker_custom_name: null } as any);
          setSavePermanent((prev) => ({ ...prev, [a.id]: false }));
        };

        return (
          <div className="flex flex-col gap-0.5">
            <select
              className={selectClass}
              value={a.taker_id ?? ""}
              onChange={async (e) => {
                const val = e.target.value || null;
                handleUpdateAssignment(a.id, { taker_id: val, taker_custom_name: val ? null : customName } as any);
                // Autofill from taker defaults
                if (val) {
                  const { data: taker } = await supabase.from("takers").select("*").eq("id", val).single();
                  if (taker) {
                    handleUpdateAssignment(a.id, {
                      email_subject: taker.email_subject || null,
                      communication_method: taker.communication_method || null,
                      phone_number: taker.phone_number || null,
                      quality: taker.quality || null,
                      audio: taker.audio || null,
                    } as any);
                    if (taker.protocol || taker.host || taker.port || taker.stream_key || taker.username || taker.password) {
                      handleUpdateEndpoint(a.id, "primary", {
                        protocol: taker.protocol || null,
                        host: taker.host || null,
                        port: taker.port || null,
                        stream_key: taker.stream_key || null,
                        username: taker.username || null,
                        password: taker.password || null,
                      });
                    }
                    if (taker.backup_host || taker.backup_port || taker.backup_stream_key || taker.backup_username || taker.backup_password) {
                      handleUpdateEndpoint(a.id, "backup", {
                        host: taker.backup_host || null,
                        port: taker.backup_port || null,
                        stream_key: taker.backup_stream_key || null,
                        username: taker.backup_username || null,
                        password: taker.backup_password || null,
                      });
                    }
                  }
                }
              }}
            >
              <option value="">— Select or type below —</option>
              {takerList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {!a.taker_id && (
              <div className="flex items-center gap-1">
                <input
                   className={`${inputClass} flex-1`}
                   placeholder="Custom name..."
                   value={getLocal(`${a.id}_custom_name`, customName)}
                   onKeyDown={(e) => { if (e.key === "Enter") flushLocal(`${a.id}_custom_name`, a.id, "taker_custom_name"); }}
                   onBlur={() => flushLocal(`${a.id}_custom_name`, a.id, "taker_custom_name")}
                   onChange={(e) => setLocal(`${a.id}_custom_name`, e.target.value)}
                />
                {customName.trim() && (
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 whitespace-nowrap"
                    onClick={() => handleSavePermanent(customName)}
                  >
                    Save ✓
                  </button>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Email / e-subject:",
      render: (a) =>
        a ? <input className={inputClass} value={getLocal(`${a.id}_email`, a.email_subject ?? "")} onChange={(e) => setLocal(`${a.id}_email`, e.target.value)} onBlur={() => flushLocal(`${a.id}_email`, a.id, "email_subject")} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(`${a.id}_email`, a.id, "email_subject"); }} /> : null,
    },
    {
      label: "Communication platform:",
      render: (a) =>
        a ? (
          <select className={selectClass} value={a.communication_method ?? ""} onChange={(e) => handleUpdateAssignment(a.id, { communication_method: e.target.value || null })}>
            <option value="">—</option>
            {COMM_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : null,
    },
    {
      label: "Phone number:",
      render: (a) =>
        a ? <input className={inputClass} value={getLocal(`${a.id}_phone`, (a as any).phone_number ?? "")} onChange={(e) => setLocal(`${a.id}_phone`, e.target.value)} onBlur={() => flushLocal(`${a.id}_phone`, a.id, "phone_number")} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(`${a.id}_phone`, a.id, "phone_number"); }} /> : null,
    },
    {
      label: "Requested Quality:",
      render: (a) =>
        a ? <input className={inputClass} value={getLocal(`${a.id}_quality`, a.quality ?? "")} onChange={(e) => setLocal(`${a.id}_quality`, e.target.value)} onBlur={() => flushLocal(`${a.id}_quality`, a.id, "quality")} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(`${a.id}_quality`, a.id, "quality"); }} /> : null,
    },
    {
      label: "Requested Audio:",
      render: (a) =>
        a ? <input className={inputClass} value={getLocal(`${a.id}_audio`, a.audio ?? "")} onChange={(e) => setLocal(`${a.id}_audio`, e.target.value)} onBlur={() => flushLocal(`${a.id}_audio`, a.id, "audio")} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(`${a.id}_audio`, a.id, "audio"); }} /> : null,
    },
    {
      label: "Test date / time:",
      render: (a) =>
        a ? (
          <input
            type="datetime-local"
            className={inputClass}
            value={a.test_datetime ? a.test_datetime.slice(0, 16) : ""}
            onChange={(e) => handleUpdateAssignment(a.id, { test_datetime: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        ) : null,
    },
    {
      label: "Test Status:",
      render: (a) => {
        if (!a) return null;
        const sm = TEST_STATUSES.find((s) => s.value === a.test_status) ?? TEST_STATUSES[0];
        return (
          <select
            className={`${selectClass} font-semibold ${sm.color} rounded px-1`}
            value={a.test_status}
            onChange={(e) => handleUpdateAssignment(a.id, { test_status: e.target.value as TestStatus })}
          >
            {TEST_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        );
      },
    },
    {
      label: "Notes:",
      render: (a) =>
        a ? <input className={inputClass} value={getLocal(`${a.id}_notes`, a.communication_notes ?? "")} onChange={(e) => setLocal(`${a.id}_notes`, e.target.value)} onBlur={() => flushLocal(`${a.id}_notes`, a.id, "communication_notes")} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(`${a.id}_notes`, a.id, "communication_notes"); }} /> : null,
    },
    {
      label: "Taker:",
      render: (a) =>
        a ? (
          <select className={selectClass} value={a.taker_id ?? ""} onChange={(e) => handleUpdateAssignment(a.id, { taker_id: e.target.value || null })}>
            <option value="">—</option>
            {takerList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : null,
    },
    {
      label: "Protocol",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "primary");
        return (
          <select className={selectClass} value={ep.protocol ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { protocol: e.target.value || null })}>
            <option value="">—</option>
            {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        );
      },
    },
    {
      label: "Host/IP",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "primary");
        const k = `${a.id}_p_host`;
        return <input className={inputClass} value={getLocal(k, ep.host ?? "")} onChange={(e) => setLocal(k, e.target.value)} onBlur={() => flushLocal(k, a.id, "host", { assignmentId: a.id, type: "primary" })} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(k, a.id, "host", { assignmentId: a.id, type: "primary" }); }} />;
      },
    },
    {
      label: "StreamKey/port",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "primary");
        const k = `${a.id}_p_stream`;
        return <input className={inputClass} value={getLocal(k, ep.stream_key ?? "")} placeholder="key / port" onChange={(e) => setLocal(k, e.target.value)} onBlur={() => flushLocal(k, a.id, "stream_key", { assignmentId: a.id, type: "primary" })} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(k, a.id, "stream_key", { assignmentId: a.id, type: "primary" }); }} />;
      },
    },
    {
      label: "User / StreamID",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "primary");
        const k = `${a.id}_p_user`;
        return <input className={inputClass} value={getLocal(k, ep.username ?? "")} onChange={(e) => setLocal(k, e.target.value)} onBlur={() => flushLocal(k, a.id, "username", { assignmentId: a.id, type: "primary" })} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(k, a.id, "username", { assignmentId: a.id, type: "primary" }); }} />;
      },
    },
    {
      label: "Pass",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "primary");
        const k = `${a.id}_p_pass`;
        return <input className={inputClass} type="password" value={getLocal(k, ep.password ?? "")} onChange={(e) => setLocal(k, e.target.value)} onBlur={() => flushLocal(k, a.id, "password", { assignmentId: a.id, type: "primary" })} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(k, a.id, "password", { assignmentId: a.id, type: "primary" }); }} />;
      },
    },
    {
      label: "2nd Host/IP",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "backup");
        const k = `${a.id}_b_host`;
        return <input className={inputClass} value={getLocal(k, ep.host ?? "")} onChange={(e) => setLocal(k, e.target.value)} onBlur={() => flushLocal(k, a.id, "host", { assignmentId: a.id, type: "backup" })} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(k, a.id, "host", { assignmentId: a.id, type: "backup" }); }} />;
      },
    },
    {
      label: "2nd Key/port",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "backup");
        const k = `${a.id}_b_stream`;
        return <input className={inputClass} value={getLocal(k, ep.stream_key ?? "")} onChange={(e) => setLocal(k, e.target.value)} onBlur={() => flushLocal(k, a.id, "stream_key", { assignmentId: a.id, type: "backup" })} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(k, a.id, "stream_key", { assignmentId: a.id, type: "backup" }); }} />;
      },
    },
    {
      label: "2nd User /StreamID",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "backup");
        const k = `${a.id}_b_user`;
        return <input className={inputClass} value={getLocal(k, ep.username ?? "")} onChange={(e) => setLocal(k, e.target.value)} onBlur={() => flushLocal(k, a.id, "username", { assignmentId: a.id, type: "backup" })} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(k, a.id, "username", { assignmentId: a.id, type: "backup" }); }} />;
      },
    },
    {
      label: "2nd Pass",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "backup");
        const k = `${a.id}_b_pass`;
        return <input className={inputClass} type="password" value={getLocal(k, ep.password ?? "")} onChange={(e) => setLocal(k, e.target.value)} onBlur={() => flushLocal(k, a.id, "password", { assignmentId: a.id, type: "backup" })} onKeyDown={(e) => { if (e.key === "Enter") flushLocal(k, a.id, "password", { assignmentId: a.id, type: "backup" }); }} />;
      },
    },
  ];

  // Event details rows
  const eventLabels: { label: string; rowSpan?: number; render: () => React.ReactNode }[] = [
    { label: "Event", rowSpan: 2, render: () => <input className={inputClass} value={ef.event_name} onChange={(e) => setEf((f) => ({ ...f, event_name: e.target.value }))} onKeyDown={handleEventKeyDown} onBlur={handleEventBlur} /> },
    {
      label: "Date",
      rowSpan: 2,
      render: () => (
        <div className="flex items-center gap-1">
          <input type="date" className={inputClass} value={ef.date} onChange={(e) => { setEf((f) => ({ ...f, date: e.target.value })); }} onBlur={handleEventBlur} />
          <span className="text-[10px] text-muted-foreground shrink-0">to</span>
          <input type="date" className={inputClass} value={ef.date_to} onChange={(e) => { setEf((f) => ({ ...f, date_to: e.target.value })); }} onBlur={handleEventBlur} />
        </div>
      ),
    },
    {
      label: "Time CET",
      rowSpan: 2,
      render: () => (
        <div className="flex items-center gap-1">
          <input type="time" className={inputClass} value={ef.cet_time?.slice(0, 5) ?? ""} onChange={(e) => { setEf((f) => ({ ...f, cet_time: e.target.value })); }} onBlur={handleEventBlur} />
          <span className="text-[10px] text-muted-foreground shrink-0">to</span>
          <input type="time" className={inputClass} value={ef.cet_time_to?.slice(0, 5) ?? ""} onChange={(e) => { setEf((f) => ({ ...f, cet_time_to: e.target.value })); }} onBlur={handleEventBlur} />
        </div>
      ),
    },
    { label: "Venue", rowSpan: 1, render: () => <input className={inputClass} value={ef.venue} onChange={(e) => setEf((f) => ({ ...f, venue: e.target.value }))} onKeyDown={handleEventKeyDown} onBlur={handleEventBlur} /> },
    {
      label: "Source",
      rowSpan: 1,
      render: () => (
        <input className={inputClass} value={ef.source} placeholder="Describe source..." onChange={(e) => setEf((f) => ({ ...f, source: e.target.value }))} onKeyDown={handleEventKeyDown} onBlur={handleEventBlur} />
      ),
    },
    {
      label: "Source Status",
      rowSpan: 1,
      render: () => {
        const currentStatus = (ef as any).source_status ?? "not_tested";
        const sm = TEST_STATUSES.find((s) => s.value === currentStatus) ?? TEST_STATUSES[0];
        return (
          <select
            className={`${selectClass} font-semibold ${sm.color} rounded px-1`}
            value={currentStatus}
            onChange={(e) => {
              setEf((f) => ({ ...f, source_status: e.target.value }));
              updateBooking.mutate({ id: booking.id, source_status: e.target.value } as any);
            }}
          >
            {TEST_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        );
      },
    },
    {
      label: "Overall\nAudio setup",
      rowSpan: 6,
      render: () => (
        <textarea
          className={`${inputClass} font-mono min-h-[100px] resize-none`}
          value={ef.audio_setup}
          onChange={(e) => setEf((f) => ({ ...f, audio_setup: e.target.value }))}
          onBlur={handleEventBlur}
          placeholder={"CH12:\nCH34:\nCH56:\nCH78:"}
        />
      ),
    },
    { label: "Project Lead", rowSpan: 1, render: () => <input className={inputClass} value={ef.project_lead} onChange={(e) => setEf((f) => ({ ...f, project_lead: e.target.value }))} onKeyDown={handleEventKeyDown} onBlur={handleEventBlur} /> },
    { label: "Notes", rowSpan: 3, render: () => <textarea className={`${inputClass} min-h-[60px] resize-none`} value={ef.event_notes} onChange={(e) => setEf((f) => ({ ...f, event_notes: e.target.value }))} onBlur={handleEventBlur} /> },
  ];

  // Map event labels to row indices
  type EventCell = { label: string; rowSpan: number; render: () => React.ReactNode };
  const eventRowMap: Record<number, EventCell> = {};
  const eventSkipRows = new Set<number>();
  let rowIdx = 0;
  for (const el of eventLabels) {
    const span = el.rowSpan ?? 1;
    eventRowMap[rowIdx] = { label: el.label, rowSpan: span, render: el.render };
    for (let s = 1; s < span; s++) eventSkipRows.add(rowIdx + s);
    rowIdx += span;
  }

  return (
    <div className="flex flex-col">
      {/* Compact header with event name and Add Taker */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border bg-muted/30 shrink-0">
        <h2 className="text-xs font-bold truncate flex-1">{ef.event_name || "Event"}</h2>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={handleAddTaker}>
          <Plus className="h-3 w-3" /> Add Taker
        </Button>
      </div>

      {/* Spreadsheet table */}
      <div className="overflow-auto">
        <table className="border-collapse w-full min-w-[800px]">
          <thead>
            <tr>
              <th colSpan={2} className={`${headerCell} text-center min-w-[240px]`}>Event details</th>
              <th className={`${headerCell} min-w-[160px]`}>Information</th>
              {takerCols.map((a, i) => (
                <th key={i} className={`${headerCell} text-center min-w-[180px]`}>
                  <div className="flex items-center justify-center gap-1">
                    Taker {i + 1}
                    {a && (
                      <button
                        onClick={() => deleteAssignment.mutate(a.id)}
                        className="text-muted-foreground hover:text-destructive text-[10px] ml-1"
                        title="Remove taker"
                      >×</button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {infoRows.map((row, ri) => {
              const eventCell = eventRowMap[ri];
              const skipEvent = eventSkipRows.has(ri);

              return (
                <tr key={ri} className="group">
                  {!skipEvent && eventCell && (
                    <>
                      <td className={eventLabelCell} rowSpan={eventCell.rowSpan} style={{ whiteSpace: "pre-line" }}>
                        {eventCell.label}
                      </td>
                      <td className={eventValueCell} rowSpan={eventCell.rowSpan}>
                        {eventCell.render()}
                      </td>
                    </>
                  )}
                  {!skipEvent && !eventCell && (
                    <>
                      <td className={eventLabelCell}></td>
                      <td className={eventValueCell}></td>
                    </>
                  )}
                  <td className={labelCell}>{row.label}</td>
                  {takerCols.map((a, ti) => (
                    <td key={ti} className={`${cellBase} bg-background`}>
                      {row.render(a, ti)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

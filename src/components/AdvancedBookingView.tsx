import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
          // Insert into takers table
          const { data, error } = await supabase
            .from("takers")
            .insert({ name: name.trim(), active: true })
            .select()
            .single();
          if (error || !data) return;
          // Update assignment to use the new taker_id and clear custom name
          handleUpdateAssignment(a.id, { taker_id: data.id, taker_custom_name: null } as any);
          setSavePermanent((prev) => ({ ...prev, [a.id]: false }));
        };

        return (
          <div className="flex flex-col gap-0.5">
            <select
              className={selectClass}
              value={a.taker_id ?? ""}
              onChange={(e) => {
                const val = e.target.value || null;
                handleUpdateAssignment(a.id, { taker_id: val, taker_custom_name: val ? null : customName } as any);
              }}
            >
              <option value="">— Select or type below —</option>
              {takerList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {!a.taker_id && (
              <>
                <input
                  className={inputClass}
                  placeholder="Custom name..."
                  value={customName}
                  onKeyDown={(e) => { if (e.key === "Enter") handleUpdateAssignment(a.id, { taker_custom_name: (e.target as HTMLInputElement).value || null } as any); }}
                  onBlur={(e) => {
                    handleUpdateAssignment(a.id, { taker_custom_name: e.target.value || null } as any);
                    if (isPermanentChecked && e.target.value?.trim()) {
                      handleSavePermanent(e.target.value);
                    }
                  }}
                  onChange={(e) => handleUpdateAssignment(a.id, { taker_custom_name: e.target.value || null } as any)}
                />
                <label className="flex items-center gap-1.5 mt-0.5 cursor-pointer">
                  <Checkbox
                    checked={isPermanentChecked}
                    onCheckedChange={(checked) => setSavePermanent((prev) => ({ ...prev, [a.id]: !!checked }))}
                    className="h-3 w-3"
                  />
                  <span className="text-[10px] text-muted-foreground">Save as permanent taker</span>
                </label>
              </>
            )}
          </div>
        );
      },
    },
    {
      label: "Email / e-subject:",
      render: (a) =>
        a ? <input className={inputClass} value={a.email_subject ?? ""} onChange={(e) => handleUpdateAssignment(a.id, { email_subject: e.target.value || null })} /> : null,
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
        a ? <input className={inputClass} value={(a as any).phone_number ?? ""} onChange={(e) => handleUpdateAssignment(a.id, { phone_number: e.target.value || null } as any)} /> : null,
    },
    {
      label: "Requested Quality:",
      render: (a) =>
        a ? <input className={inputClass} value={a.quality ?? ""} onChange={(e) => handleUpdateAssignment(a.id, { quality: e.target.value || null })} /> : null,
    },
    {
      label: "Requested Audio:",
      render: (a) =>
        a ? <input className={inputClass} value={a.audio ?? ""} onChange={(e) => handleUpdateAssignment(a.id, { audio: e.target.value || null })} /> : null,
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
        a ? <input className={inputClass} value={a.communication_notes ?? ""} onChange={(e) => handleUpdateAssignment(a.id, { communication_notes: e.target.value || null })} /> : null,
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
        return <input className={inputClass} value={ep.host ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { host: e.target.value || null })} />;
      },
    },
    {
      label: "StreamKey/port",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "primary");
        return <input className={inputClass} value={ep.stream_key ?? ""} placeholder="key / port" onChange={(e) => handleUpdateEndpoint(a.id, "primary", { stream_key: e.target.value || null })} />;
      },
    },
    {
      label: "User / StreamID",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "primary");
        return <input className={inputClass} value={ep.username ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { username: e.target.value || null })} />;
      },
    },
    {
      label: "Pass",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "primary");
        return <input className={inputClass} type="password" value={ep.password ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { password: e.target.value || null })} />;
      },
    },
    {
      label: "2nd Host/IP",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "backup");
        return <input className={inputClass} value={ep.host ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "backup", { host: e.target.value || null })} />;
      },
    },
    {
      label: "2nd Key/port",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "backup");
        return <input className={inputClass} value={ep.stream_key ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "backup", { stream_key: e.target.value || null })} />;
      },
    },
    {
      label: "2nd User /StreamID",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "backup");
        return <input className={inputClass} value={ep.username ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "backup", { username: e.target.value || null })} />;
      },
    },
    {
      label: "2nd Pass",
      render: (a) => {
        if (!a) return null;
        const ep = getEp(a.id, "backup");
        return <input className={inputClass} type="password" value={ep.password ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "backup", { password: e.target.value || null })} />;
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

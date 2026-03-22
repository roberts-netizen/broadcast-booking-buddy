import React, { useState, useMemo, useCallback } from "react";
import { Booking, useUpdateBooking } from "@/hooks/useBookings";
import { useTakerAssignments, useUpdateTakerAssignment, useCreateTakerAssignment, useDeleteTakerAssignment } from "@/hooks/useTakerAssignments";
import { useBookingReports, useUpsertBookingReport, useDeleteBookingReport } from "@/hooks/useBookingReports";
import { useTakers } from "@/hooks/useLookups";
import { Plus, Trash2 } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import { ReportCell } from "./ReportCell";

const cellClass = "px-2 py-1 border-b border-r border-border text-[11px] align-top";
const headerClass = "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border bg-muted/50 whitespace-nowrap";
const inputClass = "w-full bg-transparent text-[11px] outline-none hover:bg-muted/30 focus:bg-muted/40 focus:ring-1 focus:ring-ring rounded px-1 py-0.5";

const TEST_STATUS_COLORS: Record<string, string> = {
  not_tested: "bg-destructive",
  waiting_for_details: "bg-yellow-500",
  tested: "bg-green-500",
};

type Props = {
  bookings: Booking[];
};

type LocalBooking = {
  event_name: string;
  date: string;
  cet_time: string | null;
  source: string | null;
  event_notes: string | null;
};

export function PMBookingView({ bookings }: Props) {
  const bookingIds = useMemo(() => bookings.map((b) => b.id), [bookings]);
  const { data: allAssignments = [] } = useTakerAssignments(bookingIds);
  const { data: takers = [] } = useTakers(true);
  const { data: reports = [] } = useBookingReports(bookingIds);
  const updateBooking = useUpdateBooking();
  const updateAssignment = useUpdateTakerAssignment();
  const createAssignment = useCreateTakerAssignment();
  const deleteAssignment = useDeleteTakerAssignment();
  const upsertReport = useUpsertBookingReport();
  const deleteReport = useDeleteBookingReport();

  const maxTakers = useMemo(() => {
    let max = 0;
    for (const b of bookings) {
      const count = allAssignments.filter((a) => a.booking_id === b.id).length;
      if (count > max) max = count;
    }
    return Math.max(max, 1);
  }, [bookings, allAssignments]);

  const takerOptions = useMemo(() => takers.map((t) => ({ value: t.name, label: t.name })), [takers]);

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className={headerClass} style={{ minWidth: 100 }}>Date</th>
            <th className={headerClass} style={{ minWidth: 70 }}>Time CET</th>
            <th className={headerClass} style={{ minWidth: 160 }}>Event</th>
            <th className={headerClass} style={{ minWidth: 100 }}>Source</th>
            <th className={headerClass} style={{ minWidth: 140 }}>Notes</th>
            {Array.from({ length: maxTakers }, (_, i) => (
              <th key={i} className={headerClass} style={{ minWidth: 180 }}>
                Taker {i + 1}
              </th>
            ))}
            <th className={headerClass} style={{ minWidth: 40 }}>Report</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const report = reports.find((r) => r.booking_id === booking.id);
            return (
              <PMRow
                key={booking.id}
                booking={booking}
                assignments={allAssignments.filter((a) => a.booking_id === booking.id)}
                maxTakers={maxTakers}
                takerOptions={takerOptions}
                takers={takers}
                report={report ?? null}
                onUpdateBooking={updateBooking.mutate}
                onUpdateAssignment={updateAssignment.mutate}
                onCreateAssignment={createAssignment.mutate}
                onDeleteAssignment={deleteAssignment.mutate}
                onUpsertReport={(impact, desc) => upsertReport.mutate({ booking_id: booking.id, impact_level: impact, description: desc })}
                onDeleteReport={() => deleteReport.mutate(booking.id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type TakerOption = { value: string; label: string };

type RowProps = {
  booking: Booking;
  assignments: any[];
  maxTakers: number;
  takerOptions: TakerOption[];
  takers: any[];
  report: { impact_level: string; description: string | null } | null;
  onUpdateBooking: (data: any) => void;
  onUpdateAssignment: (data: any) => void;
  onCreateAssignment: (data: any) => void;
  onDeleteAssignment: (id: string) => void;
  onUpsertReport: (impact: "high" | "low", desc: string) => void;
  onDeleteReport: () => void;
};

function PMRow({ booking, assignments, maxTakers, takerOptions, takers, report, onUpdateBooking, onUpdateAssignment, onCreateAssignment, onDeleteAssignment, onUpsertReport, onDeleteReport }: RowProps) {
  const [local, setLocal] = useState<LocalBooking>({
    event_name: booking.event_name,
    date: booking.date,
    cet_time: booking.cet_time,
    source: booking.source,
    event_notes: booking.event_notes,
  });

  React.useEffect(() => {
    setLocal({
      event_name: booking.event_name,
      date: booking.date,
      cet_time: booking.cet_time,
      source: booking.source,
      event_notes: booking.event_notes,
    });
  }, [booking.event_name, booking.date, booking.cet_time, booking.source, booking.event_notes]);

  const handleBlur = useCallback(
    (field: keyof LocalBooking) => {
      if (local[field] !== (booking as any)[field]) {
        onUpdateBooking({ id: booking.id, [field]: local[field] });
      }
    },
    [local, booking, onUpdateBooking]
  );

  const sorted = useMemo(() => [...assignments].sort((a, b) => a.sort_order - b.sort_order), [assignments]);

  const reportBgClass = report?.impact_level === "high"
    ? "bg-red-500/20"
    : report?.impact_level === "low"
    ? "bg-yellow-500/20"
    : "";

  return (
    <tr className="hover:bg-muted/30">
      <td className={cellClass}>
        <input type="date" className={inputClass} value={local.date} onChange={(e) => setLocal((p) => ({ ...p, date: e.target.value }))} onBlur={() => handleBlur("date")} />
      </td>
      <td className={cellClass}>
        <input type="time" className={inputClass} value={local.cet_time?.slice(0, 5) ?? ""} onChange={(e) => setLocal((p) => ({ ...p, cet_time: e.target.value }))} onBlur={() => handleBlur("cet_time")} />
      </td>
      <td className={cellClass}>
        <input className={inputClass} value={local.event_name} onChange={(e) => setLocal((p) => ({ ...p, event_name: e.target.value }))} onBlur={() => handleBlur("event_name")} />
      </td>
      <td className={cellClass}>
        <input className={inputClass} value={local.source ?? ""} onChange={(e) => setLocal((p) => ({ ...p, source: e.target.value }))} onBlur={() => handleBlur("source")} />
      </td>
      <td className={cellClass}>
        <input className={inputClass} value={local.event_notes ?? ""} onChange={(e) => setLocal((p) => ({ ...p, event_notes: e.target.value }))} onBlur={() => handleBlur("event_notes")} placeholder="Notes..." />
      </td>
      {Array.from({ length: maxTakers }, (_, i) => {
        const assignment = sorted[i];
        return (
          <td key={i} className={cellClass} style={{ minWidth: 180 }}>
            {assignment ? (
              <TakerCell
                assignment={assignment}
                takerOptions={takerOptions}
                takers={takers}
                onUpdate={onUpdateAssignment}
                onDelete={onDeleteAssignment}
              />
            ) : i === sorted.length ? (
              <button
                onClick={() => onCreateAssignment({ booking_id: booking.id, sort_order: sorted.length })}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            ) : null}
          </td>
        );
      })}
      <td className={`${cellClass} ${reportBgClass}`} style={{ minWidth: 40 }}>
        <ReportCell
          impactLevel={report ? (report.impact_level as "high" | "low") : null}
          description={report?.description ?? ""}
          onSave={onUpsertReport}
          onClear={onDeleteReport}
        />
      </td>
    </tr>
  );
}

type TakerCellProps = {
  assignment: any;
  takerOptions: TakerOption[];
  takers: any[];
  onUpdate: (data: any) => void;
  onDelete: (id: string) => void;
};

function TakerCell({ assignment, takerOptions, takers, onUpdate, onDelete }: TakerCellProps) {
  const [emailSubject, setEmailSubject] = useState(assignment.email_subject ?? "");
  const [commNotes, setCommNotes] = useState(assignment.communication_notes ?? "");

  React.useEffect(() => {
    setEmailSubject(assignment.email_subject ?? "");
    setCommNotes(assignment.communication_notes ?? "");
  }, [assignment.email_subject, assignment.communication_notes]);

  const takerDisplayName = assignment.taker_name || assignment.taker_custom_name || "";
  const statusColor = TEST_STATUS_COLORS[assignment.test_status] || TEST_STATUS_COLORS.not_tested;

  const handleTakerChange = (name: string) => {
    const found = takers.find((t) => t.name === name);
    if (found) {
      onUpdate({ id: assignment.id, taker_id: found.id, taker_custom_name: null });
    } else if (name) {
      onUpdate({ id: assignment.id, taker_id: null, taker_custom_name: name });
    } else {
      onUpdate({ id: assignment.id, taker_id: null, taker_custom_name: null });
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className={`h-2 w-2 rounded-full shrink-0 ${statusColor}`} title={assignment.test_status?.replace(/_/g, " ")} />
        <SearchableSelect
          value={takerDisplayName}
          options={takerOptions}
          onChange={handleTakerChange}
          placeholder="Taker..."
          className="flex-1 text-[11px] font-medium"
          freeText
        />
        <button
          onClick={() => onDelete(assignment.id)}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <input
        className={`${inputClass} text-[10px] text-muted-foreground`}
        value={emailSubject}
        onChange={(e) => setEmailSubject(e.target.value)}
        onBlur={() => {
          if (emailSubject !== (assignment.email_subject ?? "")) {
            onUpdate({ id: assignment.id, email_subject: emailSubject || null });
          }
        }}
        placeholder="Email subject..."
      />
      <input
        className={`${inputClass} text-[10px] text-muted-foreground`}
        value={commNotes}
        onChange={(e) => setCommNotes(e.target.value)}
        onBlur={() => {
          if (commNotes !== (assignment.communication_notes ?? "")) {
            onUpdate({ id: assignment.id, communication_notes: commNotes || null });
          }
        }}
        placeholder="Comm notes..."
      />
    </div>
  );
}

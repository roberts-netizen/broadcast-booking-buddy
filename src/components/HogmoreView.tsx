import React, { useState, useMemo } from "react";
import { useBookings, Booking } from "@/hooks/useBookings";
import { useTakerAssignments } from "@/hooks/useTakerAssignments";
import { useProjectTakerEndpoints } from "@/hooks/useProjectTakerEndpoints";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Wifi } from "lucide-react";

type TimeTab = "today" | "upcoming" | "past";

const headerClass = "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border bg-muted/50 whitespace-nowrap";
const cellClass = "px-2 py-1.5 border-b border-r border-border text-[11px] align-top";
const labelCell = "px-2 py-1 text-[10px] font-medium text-muted-foreground bg-muted/30 whitespace-nowrap border-b border-r border-border";
const valueCell = "px-2 py-1 text-[11px] border-b border-r border-border";

const STATUS_COLORS: Record<string, string> = {
  tested: "text-green-600 bg-green-500/10",
  not_tested: "text-destructive bg-destructive/10",
};

export function HogmoreView() {
  const [timeTab, setTimeTab] = useState<TimeTab>("today");
  const { data: bookings = [], isLoading } = useBookings({ tournamentType: "HOGMORE" });

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const endDate = b.date_to || b.date;
      if (timeTab === "today") return b.date <= today && endDate >= today;
      if (timeTab === "upcoming") return b.date > today;
      if (timeTab === "past") return endDate < today;
      return true;
    });
  }, [bookings, timeTab, today]);

  const tabs: { key: TimeTab; label: string; count: number }[] = [
    { key: "today", label: "Today", count: bookings.filter((b) => b.date <= today && (b.date_to || b.date) >= today).length },
    { key: "upcoming", label: "Upcoming", count: bookings.filter((b) => b.date > today).length },
    { key: "past", label: "Past", count: bookings.filter((b) => (b.date_to || b.date) < today).length },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-0 mr-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTimeTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                timeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] text-muted-foreground">({t.count})</span>
            </button>
          ))}
        </div>
        <Badge variant="outline" className="ml-auto gap-1 text-[10px]">
          <Wifi className="h-3 w-3" />
          Auto-synced from Hogmore MCR
        </Badge>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No bookings found</div>
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className={headerClass} style={{ width: 30 }}></th>
                <th className={headerClass} style={{ width: 95 }}>Date</th>
                <th className={headerClass} style={{ width: 65 }}>GMT</th>
                <th className={headerClass} style={{ minWidth: 200 }}>Event</th>
                <th className={headerClass} style={{ minWidth: 180 }}>Source</th>
                <th className={headerClass} style={{ width: 90 }}>Status</th>
                <th className={headerClass} style={{ minWidth: 160 }}>Notes</th>
                <th className={headerClass} style={{ minWidth: 160 }}>Taker</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <HogmoreRow key={booking.id} booking={booking} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HogmoreRow({ booking }: { booking: Booking }) {
  const [expanded, setExpanded] = useState(false);
  const { data: assignments = [] } = useTakerAssignments([booking.id]);
  const assignmentIds = useMemo(() => assignments.map((a) => a.id), [assignments]);
  const { data: endpoints = [] } = useProjectTakerEndpoints(assignmentIds);

  const firstAssignment = assignments[0];
  const takerName = firstAssignment
    ? firstAssignment.taker_name || (firstAssignment as any).taker_custom_name || "—"
    : "—";

  const sourceStatus = (booking as any).source_status ?? "not_tested";
  const statusStyle = STATUS_COLORS[sourceStatus] || STATUS_COLORS.not_tested;

  return (
    <>
      <tr className="hover:bg-muted/30">
        <td className={cellClass} style={{ width: 30, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </td>
        <td className={cellClass}>{booking.date}</td>
        <td className={cellClass}>{booking.gmt_time?.slice(0, 5)}</td>
        <td className={cellClass} style={{ maxWidth: 200 }}>
          <span className="truncate block">{booking.event_name}</span>
        </td>
        <td className={cellClass} style={{ maxWidth: 180 }}>
          <span className="truncate block">{booking.source || "—"}</span>
        </td>
        <td className={cellClass}>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusStyle}`}>
            {sourceStatus.replace(/_/g, " ")}
          </span>
        </td>
        <td className={cellClass}>{booking.event_notes || "—"}</td>
        <td className={cellClass}>{takerName}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-muted/10 border-b border-border">
            <HogmoreExpandedDetail booking={booking} assignments={assignments} endpoints={endpoints} />
          </td>
        </tr>
      )}
    </>
  );
}

function HogmoreExpandedDetail({
  booking,
  assignments,
  endpoints,
}: {
  booking: Booking;
  assignments: any[];
  endpoints: any[];
}) {
  const endpointMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const ep of endpoints) map[`${ep.taker_assignment_id}_${ep.endpoint_type}`] = ep;
    return map;
  }, [endpoints]);

  return (
    <div className="px-4 py-3 grid grid-cols-2 gap-4">
      {/* Event Details */}
      <div>
        <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Event Details</div>
        <table className="w-full border-collapse">
          <tbody>
            <DetailRow label="Event" value={booking.event_name} />
            <DetailRow label="Date" value={booking.date} />
            <DetailRow label="GMT Time" value={booking.gmt_time?.slice(0, 5) || "—"} />
            <DetailRow label="CET Time" value={booking.cet_time?.slice(0, 5) || "—"} />
            <DetailRow label="Venue" value={(booking as any).venue || "—"} />
            <DetailRow label="Source" value={booking.source || "—"} />
            <DetailRow label="Source Status" value={((booking as any).source_status || "not_tested").replace(/_/g, " ")} />
            <DetailRow label="Audio Setup" value={(booking as any).audio_setup || "—"} multiline />
            <DetailRow label="Notes" value={booking.event_notes || "—"} />
            <DetailRow label="Work Order" value={booking.work_order_id || "—"} />
            <DetailRow label="Project Lead" value={(booking as any).project_lead || "—"} />
          </tbody>
        </table>
      </div>

      {/* Taker Details */}
      <div>
        <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
          Taker{assignments.length > 1 ? "s" : ""}
        </div>
        {assignments.length === 0 ? (
          <div className="text-[11px] text-muted-foreground">No takers assigned</div>
        ) : (
          assignments.map((a, i) => {
            const ep = endpointMap[`${a.id}_primary`] ?? {};
            return (
              <div key={a.id} className="mb-3">
                {assignments.length > 1 && (
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Taker {i + 1}</div>
                )}
                <table className="w-full border-collapse">
                  <tbody>
                    <DetailRow label="Name" value={a.taker_name || a.taker_custom_name || "—"} />
                    <DetailRow label="Protocol" value={ep.protocol || "—"} />
                    <DetailRow label="Host" value={ep.host || "—"} />
                    <DetailRow label="Stream Key" value={ep.stream_key || "—"} />
                    <DetailRow label="Audio" value={a.audio || "—"} />
                    <DetailRow label="Quality" value={a.quality || "—"} />
                    <DetailRow label="Email/Contact" value={a.email_subject || "—"} />
                    <DetailRow label="Test Status" value={(a.test_status || "not_tested").replace(/_/g, " ")} />
                    <DetailRow label="Comm Notes" value={a.communication_notes || "—"} />
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <tr>
      <td className={labelCell} style={{ width: 120 }}>{label}</td>
      <td className={valueCell}>
        {multiline ? (
          <pre className="whitespace-pre-wrap text-[11px] font-sans">{value}</pre>
        ) : (
          value
        )}
      </td>
    </tr>
  );
}

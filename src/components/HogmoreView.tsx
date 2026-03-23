import React, { useState, useMemo } from "react";
import { useBookings, Booking } from "@/hooks/useBookings";
import { useBookingTakerAssignments, useUpdateAssignmentTestStatus } from "@/hooks/useBookingTakerAssignments";
import { useProjectTakerEndpoints } from "@/hooks/useProjectTakerEndpoints";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Wifi } from "lucide-react";

type TimeTab = "today" | "upcoming" | "past";

const headerClass = "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-r border-border bg-muted/50 whitespace-nowrap";
const cellClass = "px-2 py-1.5 border-b border-r border-border text-[11px] align-top";
const labelCell = "px-2 py-1 text-[10px] font-medium text-muted-foreground bg-muted/30 whitespace-nowrap border-b border-r border-border";
const valueCell = "px-2 py-1 text-[11px] border-b border-r border-border";

const STATUS_DOT: Record<string, string> = {
  tested: "bg-green-500",
  not_tested: "bg-destructive",
};

function parseBettingName(settings: string | null | undefined): string {
  if (!settings) return "—";
  try {
    const parsed = JSON.parse(settings);
    return parsed?.name || "—";
  } catch {
    return "—";
  }
}

function BettingBadge({ bettingSettings }: { bettingSettings: string | null | undefined }) {
  const name = parseBettingName(bettingSettings);
  if (name === "—") return <span>—</span>;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
      {name}
    </span>
  );
}

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
                <th className={headerClass} style={{ minWidth: 160 }}>Notes</th>
                <th className={headerClass} style={{ minWidth: 200 }}>Takers</th>
                <th className={headerClass} style={{ minWidth: 120 }}>Betting</th>
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
  const { data: assignments = [] } = useBookingTakerAssignments([booking.id]);
  const updateStatus = useUpdateAssignmentTestStatus();
  const assignmentIds = useMemo(() => assignments.map((a) => a.id), [assignments]);
  const { data: endpoints = [] } = useProjectTakerEndpoints(assignmentIds);

  // Split by role
  const sourceAssignments = useMemo(() => assignments.filter((a) => a.role === "source"), [assignments]);
  const takerAssignments = useMemo(() => assignments.filter((a) => a.role !== "source"), [assignments]);

  const sourceStatus = sourceAssignments.length > 0
    ? (sourceAssignments[0].test_status ?? "not_tested")
    : (booking.source_status ?? "not_tested");
  const sourceDot = STATUS_DOT[sourceStatus] || STATUS_DOT.not_tested;
  const sourceName = sourceAssignments.length > 0
    ? (sourceAssignments[0].taker_name || sourceAssignments[0].taker_channel_map_label || "—")
    : (booking.source || "—");

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
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${sourceDot}`} title={sourceStatus.replace(/_/g, " ")} />
            <span className="truncate">{sourceName}</span>
          </div>
        </td>
        <td className={cellClass}>{booking.event_notes || "—"}</td>
        <td className={`${cellClass} !p-0`}>
          {takerAssignments.length === 0 ? <span className="px-2 py-1.5">—</span> : (
            <div className="flex items-stretch">
              {takerAssignments.map((a, i) => {
                const curStatus = a.test_status || "not_tested";
                const tDot = curStatus === "tested" ? STATUS_DOT.tested : STATUS_DOT.not_tested;
                const statusLabel = curStatus === "tested" ? "tested" : "not tested";
                const protocol = a.taker_protocol || "";
                const streamInfo = [a.actual_channel_id, protocol ? `[${protocol}]` : ""].filter(Boolean).join(" ");
                const audioInfo = a.taker_audio || "";
                const toggleStatus = () => {
                  const next = curStatus === "tested" ? "not_tested" : "tested";
                  updateStatus.mutate({ id: a.id, test_status: next });
                };
                return (
                  <div key={a.id} className={`flex flex-col gap-0.5 px-2 py-1 whitespace-nowrap ${i < takerAssignments.length - 1 ? "border-r border-border" : ""}`}>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full shrink-0 cursor-pointer ${tDot}`}
                        title={`${statusLabel} — click to toggle`}
                        onClick={(e) => { e.stopPropagation(); toggleStatus(); }}
                      />
                      <span className="text-[11px] font-medium">{a.taker_channel_map_label || a.taker_name || a.actual_channel_id || "—"}</span>
                    </div>
                    {streamInfo && <span className="text-[10px] text-muted-foreground pl-3.5">{streamInfo}</span>}
                    {audioInfo && <span className="text-[10px] text-muted-foreground pl-3.5">Audio - {audioInfo}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </td>
        <td className={cellClass}>
          <BettingBadge bettingSettings={booking.betting_settings} />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-muted/10 border-b border-border">
            <HogmoreExpandedDetail booking={booking} sourceAssignments={sourceAssignments} takerAssignments={takerAssignments} endpoints={endpoints} />
          </td>
        </tr>
      )}
    </>
  );
}

function HogmoreExpandedDetail({
  booking,
  sourceAssignments,
  takerAssignments,
  endpoints,
}: {
  booking: Booking;
  sourceAssignments: any[];
  takerAssignments: any[];
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
            <DetailRow label="Notes" value={booking.event_notes || "—"} />
            <DetailRow label="Work Order" value={booking.work_order_id || "—"} />
            <DetailRow label="Project Lead" value={(booking as any).project_lead || "—"} />
            <DetailRow label="Betting Delivery" value={parseBettingName(booking.betting_settings)} />
          </tbody>
        </table>
      </div>

      {/* Source & Takers */}
      <div>
        {/* SOURCE panel */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">Source</div>
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/30">
              SOURCE
            </span>
          </div>
          {sourceAssignments.length === 0 ? (
            <div className="text-[11px] text-muted-foreground">
              {booking.source ? (
                <table className="w-full border-collapse">
                  <tbody>
                    <DetailRow label="Name" value={booking.source || "—"} />
                    <DetailRow label="Status" value={((booking as any).source_status || "not_tested").replace(/_/g, " ")} />
                  </tbody>
                </table>
              ) : "No source assigned"}
            </div>
          ) : (
            sourceAssignments.map((a) => (
              <StreamDetailTable key={a.id} assignment={a} />
            ))
          )}
        </div>

        {/* TAKERS panel */}
        <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
          Taker{takerAssignments.length > 1 ? "s" : ""}
        </div>
        {takerAssignments.length === 0 ? (
          <div className="text-[11px] text-muted-foreground">No takers assigned</div>
        ) : (
          takerAssignments.map((a, i) => (
            <div key={a.id} className="mb-3">
              {takerAssignments.length > 1 && (
                <div className="text-[10px] font-medium text-muted-foreground mb-1">Taker {i + 1}</div>
              )}
              <StreamDetailTable assignment={a} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Unified stream detail table — used for both source and taker assignments */
function StreamDetailTable({ assignment: a }: { assignment: any }) {
  const statusLabel = (a.test_status || "not_tested").replace(/_/g, " ");
  const statusBadge = a.test_status === "tested"
    ? "bg-green-500/20 text-green-700 dark:text-green-300"
    : "bg-destructive/20 text-destructive";

  return (
    <table className="w-full border-collapse">
      <tbody>
        <DetailRow label="Name" value={a.taker_name || a.taker_channel_map_label || "—"} />
        <tr>
          <td className={labelCell} style={{ width: 120 }}>Status</td>
          <td className={valueCell}>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusBadge}`}>
              {statusLabel}
            </span>
          </td>
        </tr>
        <DetailRow label="Protocol" value={a.taker_protocol || "—"} />
        <DetailRow label="Host/URL" value={a.taker_host || "—"} />
        <DetailRow label="Stream Key" value={a.taker_stream_key || "—"} />
        <DetailRow label="Audio 1" value={a.taker_audio || "—"} />
        <DetailRow label="Audio 2" value="—" />
        <DetailRow label="Contact" value={a.taker_email_subject || "—"} />
      </tbody>
    </table>
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

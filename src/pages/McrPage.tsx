import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, ExternalLink, X } from "lucide-react";
import { useBookings, Booking } from "@/hooks/useBookings";
import { useLeagues, useCategories, useTakers } from "@/hooks/useLookups";
import { useTakerAssignments, TakerAssignment, TestStatus, useUpdateTakerAssignment } from "@/hooks/useTakerAssignments";
import { useBookingTakerAssignments, BookingTakerAssignment } from "@/hooks/useBookingTakerAssignments";
import { useProjectTakerEndpoints, ProjectTakerEndpoint, useUpsertEndpoint } from "@/hooks/useProjectTakerEndpoints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TEST_STATUS_MAP: Record<string, { label: string; dot: string }> = {
  not_tested: { label: "Not Tested", dot: "🔴" },
  waiting_for_details: { label: "Waiting for details", dot: "🟡" },
  tested: { label: "Tested", dot: "🟢" },
};

type Section = "today" | "upcoming" | "past";

export default function McrPage({ onNavigateToBooking }: { onNavigateToBooking?: (bookingId: string, category: string) => void }) {
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(["today", "upcoming"]));
  const [selectedTaker, setSelectedTaker] = useState<TakerAssignment | null>(null);

  const { data: categories = [] } = useCategories(true);
  const { data: leagues = [] } = useLeagues(true);

  // Fetch MCR bookings
  const { data: mcrBookings = [], isLoading: mcrLoading } = useBookings({ tournamentType: "MCR" });

  // Fetch ADV category bookings
  const advCategories = useMemo(() => categories.filter((c) => c.type === "advanced"), [categories]);
  const advCatNames = useMemo(() => advCategories.map((c) => c.name), [advCategories]);

  // Fetch each ADV category's bookings
  const { data: advBookings0 = [] } = useBookings(advCatNames[0] ? { tournamentType: advCatNames[0] } : undefined);
  const { data: advBookings1 = [] } = useBookings(advCatNames[1] ? { tournamentType: advCatNames[1] } : undefined);
  const { data: advBookings2 = [] } = useBookings(advCatNames[2] ? { tournamentType: advCatNames[2] } : undefined);

  // Build category label map for ADV bookings
  const advWithCategory = useMemo(() => {
    const tagged: (Booking & { _category?: string })[] = [];
    if (advCatNames[0]) for (const b of advBookings0) tagged.push({ ...b, _category: advCatNames[0] });
    if (advCatNames[1]) for (const b of advBookings1) tagged.push({ ...b, _category: advCatNames[1] });
    if (advCatNames[2]) for (const b of advBookings2) tagged.push({ ...b, _category: advCatNames[2] });
    return tagged;
  }, [advBookings0, advBookings1, advBookings2, advCatNames]);

  // Merge all bookings, tag MCR ones
  const allBookings = useMemo(() => {
    const mcr = mcrBookings.map((b) => ({ ...b, _category: "MCR" as string }));
    return [...mcr, ...advWithCategory].sort((a, b) => {
      // Sort by date then gmt_time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.gmt_time || "").localeCompare(b.gmt_time || "");
    });
  }, [mcrBookings, advWithCategory]);

  // Taker assignments for all bookings
  const allIds = useMemo(() => allBookings.map((b) => b.id), [allBookings]);
  const { data: takerAssignments = [] } = useTakerAssignments(allIds);
  const { data: btaAssignments = [] } = useBookingTakerAssignments(allIds);

  // Fetch project_taker_endpoints for ADV taker details
  const takerAssignmentIds = useMemo(() => takerAssignments.map((a) => a.id), [takerAssignments]);
  const { data: endpoints = [] } = useProjectTakerEndpoints(takerAssignmentIds);

  const endpointsByAssignment = useMemo(() => {
    const map: Record<string, ProjectTakerEndpoint[]> = {};
    for (const e of endpoints) {
      if (!map[e.taker_assignment_id]) map[e.taker_assignment_id] = [];
      map[e.taker_assignment_id].push(e);
    }
    return map;
  }, [endpoints]);

  const takersByBooking = useMemo(() => {
    const map: Record<string, TakerAssignment[]> = {};
    for (const a of takerAssignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [takerAssignments]);

  const btaByBooking = useMemo(() => {
    const map: Record<string, BookingTakerAssignment[]> = {};
    for (const a of btaAssignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [btaAssignments]);

  const { data: takers = [] } = useTakers(true);

  const takerNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of takers) m[t.id] = t.name;
    return m;
  }, [takers]);

  const leagueMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const l of leagues) m[l.id] = l.name;
    return m;
  }, [leagues]);

  const today = new Date().toISOString().slice(0, 10);

  // Group bookings respecting date_to for multi-day events
  const grouped = useMemo(() => {
    const todayList: typeof allBookings = [];
    const upcoming: typeof allBookings = [];
    const past: typeof allBookings = [];

    for (const b of allBookings) {
      const endDate = (b as any).date_to || b.date;
      if (b.date <= today && endDate >= today) todayList.push(b);
      else if (b.date > today) upcoming.push(b);
      else past.push(b);
    }
    return { today: todayList, upcoming, past };
  }, [allBookings, today]);

  const toggleSection = (s: Section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const getStatusBadge = (bookingId: string) => {
    const ta = takersByBooking[bookingId] ?? [];
    const bta = btaByBooking[bookingId] ?? [];
    const totalTakers = ta.length + bta.length;
    if (totalTakers === 0) return <Badge variant="outline" className="text-[9px] px-1 py-0">—</Badge>;
    const tested = ta.filter((a) => a.test_status === "tested").length;
    if (ta.length === 0) return <Badge variant="outline" className="text-[9px] px-1 py-0">{bta.length} assigned</Badge>;
    if (tested === ta.length) return <Badge className="text-[9px] px-1 py-0 bg-[hsl(var(--primary)/0.15)] text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%,0.3)]">✓ All tested</Badge>;
    if (tested > 0) return <Badge className="text-[9px] px-1 py-0 bg-[hsl(var(--accent))] text-[hsl(45,93%,47%)] border-[hsl(45,93%,47%,0.3)]">{tested}/{ta.length}</Badge>;
    return <Badge variant="destructive" className="text-[9px] px-1 py-0">Not tested</Badge>;
  };

  const renderTakerDetails = (bookingId: string, isAdv: boolean) => {
    const ta = takersByBooking[bookingId] ?? [];
    const bta = btaByBooking[bookingId] ?? [];

    if (ta.length === 0 && bta.length === 0) {
      return <span className="text-muted-foreground">—</span>;
    }

    // ADV events: show taker name + host/IP + key/port from assignments & endpoints
    if (isAdv && ta.length > 0) {
      return (
        <div className="flex divide-x divide-border">
          {ta.map((a, i) => {
            const name = a.taker_name || (a as any).taker_custom_name || `Taker ${i + 1}`;
            const statusColor = a.test_status === "tested"
              ? "bg-[hsl(142,71%,45%)]"
              : a.test_status === "waiting_for_details"
              ? "bg-[hsl(45,93%,47%)]"
              : "bg-[hsl(0,72%,51%)]";
            const eps = endpointsByAssignment[a.id] ?? [];
            const aProto = a.protocol || "";
            const aHost = a.host || "";
            const aPort = a.port || "";
            const aKey = a.stream_key_or_channel_id || "";

            const connections: { proto: string; host: string; port: string; key: string }[] = [];
            if (eps.length > 0) {
              for (const ep of eps) {
                connections.push({ proto: ep.protocol || "", host: ep.host || "", port: ep.port || "", key: ep.stream_key || "" });
              }
            } else if (aHost || aKey || aProto) {
              connections.push({ proto: aProto, host: aHost, port: aPort, key: aKey });
            }

            return (
              <div
                key={a.id}
                className="text-[10px] leading-tight cursor-pointer hover:bg-muted/50 px-2 py-0.5 transition-colors flex items-center gap-1.5 first:pl-0"
                onClick={(e) => { e.stopPropagation(); setSelectedTaker(a); }}
                title="Click to view full details"
              >
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                <span className="font-medium text-primary underline decoration-dotted">{name}</span>
                {connections.length > 0 && (
                  <span className="text-muted-foreground font-mono text-[9px]">
                    {connections.map((c) => {
                      const parts: string[] = [];
                      if (c.proto) parts.push(c.proto);
                      if (c.host) parts.push(c.host + (c.port ? `:${c.port}` : ""));
                      if (c.key) parts.push(`key:${c.key}`);
                      return parts.join(" ");
                    }).join(" | ")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // MCR events: show taker label + actual_channel_id
    if (bta.length > 0) {
      return (
        <div className="flex divide-x divide-border">
          {bta.map((a, i) => {
            const label = a.taker_channel_map_label || `Taker ${i + 1}`;
            const chId = a.actual_channel_id || "";
            return (
              <div key={a.id} className="flex items-center gap-1 text-[10px] leading-tight px-2 first:pl-0">
                <span className="font-medium text-foreground">{label}</span>
                {chId && <span className="text-muted-foreground font-mono">{chId}</span>}
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback: taker_assignments for MCR
    return (
      <div className="flex divide-x divide-border">
        {ta.map((a, i) => {
          const name = a.taker_name || (a as any).taker_custom_name || `Taker ${i + 1}`;
          const statusColor = a.test_status === "tested"
            ? "bg-[hsl(142,71%,45%)]"
            : a.test_status === "waiting_for_details"
            ? "bg-[hsl(45,93%,47%)]"
            : "bg-[hsl(0,72%,51%)]";
          const chId = a.stream_key_or_channel_id || "";
          return (
            <div key={a.id} className="flex items-center gap-1 text-[10px] leading-tight px-2 first:pl-0">
              <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
              <span className="font-medium text-foreground">{name}</span>
              {chId && <span className="text-muted-foreground font-mono">{chId}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSection = (title: string, key: Section, items: typeof allBookings, color: string) => {
    const isExpanded = expandedSections.has(key);
    return (
      <div key={key} className="border-b border-border last:border-b-0">
        <button
          onClick={() => toggleSection(key)}
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 transition-colors ${color}`}
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {title}
          <span className="ml-1 text-muted-foreground font-normal">({items.length})</span>
        </button>
        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-1.5 text-left font-semibold w-[55px] border border-border">Type</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[95px] border border-border">Date</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[50px] border border-border">GMT</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[50px] border border-border">CET</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[140px] border border-border">Event</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[80px] border border-border">League</th>
                  <th className="px-3 py-1.5 text-left font-semibold border border-border">Takers</th>
                  <th className="px-1 py-1.5 text-left font-semibold w-[30px] border border-border"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-4 text-center text-xs text-muted-foreground border border-border">No events</td></tr>
                ) : (
                  items.map((b: any) => {
                    const cat = b._category || "MCR";
                    const isAdv = cat !== "MCR";
                    return (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 border border-border">
                          {isAdv ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{cat}</Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">MCR</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap border border-border">
                          {b.date}
                          {(b as any).date_to && (b as any).date_to !== b.date && (
                            <span className="text-muted-foreground ml-0.5">→{(b as any).date_to.slice(5)}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap border border-border">{b.gmt_time?.slice(0, 5)}</td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap border border-border">{b.cet_time?.slice(0, 5) ?? ""}</td>
                        <td className="px-3 py-1.5 text-xs font-medium truncate max-w-[140px] border border-border" title={b.event_name}>{b.event_name}</td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground border border-border">{b.league_id ? leagueMap[b.league_id] ?? "" : ""}</td>
                        <td className="px-3 py-1.5 border border-border">{renderTakerDetails(b.id, isAdv)}</td>
                        <td className="px-1 py-1.5 border border-border w-[30px]">
                          {onNavigateToBooking && (
                            <button
                              onClick={() => onNavigateToBooking(b.id, cat)}
                              className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
                              title="Open in Events view"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const isLoading = mcrLoading;

  const renderTakerDetailDialog = () => {
    if (!selectedTaker) return null;
    const a = selectedTaker;
    const name = a.taker_name || (a as any).taker_custom_name || "Taker";
    const status = TEST_STATUS_MAP[a.test_status] ?? TEST_STATUS_MAP.not_tested;
    const eps = endpointsByAssignment[a.id] ?? [];

    const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
      if (!value) return null;
      return (
        <div className="flex items-start gap-2 py-1 border-b border-border/50 last:border-b-0">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground w-[120px] shrink-0">{label}</span>
          <span className="text-xs text-foreground font-mono break-all">{value}</span>
        </div>
      );
    };

    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-0.5 mb-1 mt-3 first:mt-0">
        {children}
      </div>
    );

    return (
      <Dialog open={!!selectedTaker} onOpenChange={() => setSelectedTaker(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <span>{status.dot}</span>
              <span>{name}</span>
              {a.protocol && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.protocol}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-0">
            <SectionLabel>Technical Details</SectionLabel>
            <DetailRow label="Protocol" value={a.protocol} />
            <DetailRow label="Host / IP" value={a.host} />
            <DetailRow label="Port" value={a.port} />
            <DetailRow label="Stream Key" value={a.stream_key_or_channel_id} />
            <DetailRow label="Username" value={a.username} />
            <DetailRow label="Password" value={a.password ? "••••••••" : null} />
            <DetailRow label="Quality" value={a.quality} />
            <DetailRow label="Audio" value={a.audio} />

            {eps.length > 0 && (
              <>
                <SectionLabel>Endpoints</SectionLabel>
                {eps.map((ep) => (
                  <div key={ep.id} className="bg-muted/30 rounded p-2 mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{ep.endpoint_type}</span>
                    <DetailRow label="Protocol" value={ep.protocol} />
                    <DetailRow label="Host" value={ep.host} />
                    <DetailRow label="Port" value={ep.port} />
                    <DetailRow label="Stream Key" value={ep.stream_key} />
                    <DetailRow label="Username" value={ep.username} />
                    <DetailRow label="Password" value={ep.password ? "••••••••" : null} />
                  </div>
                ))}
              </>
            )}

            <SectionLabel>Communication</SectionLabel>
            <DetailRow label="Method" value={a.communication_method} />
            <DetailRow label="WhatsApp" value={a.whatsapp_details} />
            <DetailRow label="Email Subject" value={a.email_subject} />
            <DetailRow label="Phone" value={(a as any).phone_number} />
            <DetailRow label="Notes" value={a.communication_notes} />

            <SectionLabel>Testing</SectionLabel>
            <div className="flex items-start gap-2 py-1 border-b border-border/50">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground w-[120px] shrink-0">Status</span>
              <span className="text-xs">{status.dot} {status.label}</span>
            </div>
            <DetailRow label="Tested By" value={a.tested_by} />
            <DetailRow label="Test Date" value={a.test_datetime ? new Date(a.test_datetime).toLocaleString() : null} />
            <DetailRow label="Test Notes" value={a.test_notes} />
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
        <span className="text-xs font-semibold">MCR Overview</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{allBookings.length} events total</span>
      </div>
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {renderSection("Today", "today", grouped.today, "text-primary")}
            {renderSection("Upcoming", "upcoming", grouped.upcoming, "text-foreground")}
            {renderSection("Past", "past", grouped.past, "text-muted-foreground")}
          </>
        )}
      </div>
      {renderTakerDetailDialog()}
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useBookings, Booking } from "@/hooks/useBookings";
import { useLeagues, useCategories } from "@/hooks/useLookups";
import { useTakerAssignments, TakerAssignment } from "@/hooks/useTakerAssignments";
import { useBookingTakerAssignments, BookingTakerAssignment } from "@/hooks/useBookingTakerAssignments";
import { useProjectTakerEndpoints, ProjectTakerEndpoint } from "@/hooks/useProjectTakerEndpoints";
import { Badge } from "@/components/ui/badge";

type Section = "today" | "upcoming" | "past";

export default function McrPage() {
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(["today", "upcoming"]));

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

    // ADV events: show taker name + protocol host:port or stream key
    if (isAdv && ta.length > 0) {
      return (
        <div className="flex flex-col gap-0.5">
          {ta.map((a, i) => {
            const name = a.taker_name || (a as any).taker_custom_name || `Taker ${i + 1}`;
            const proto = a.protocol || "";
            const host = a.host || "";
            const port = a.port || "";
            const streamKey = a.stream_key_or_channel_id || "";
            let detail = "";
            if (host && port) detail = `${host}:${port}`;
            else if (host) detail = host;
            else if (streamKey) detail = streamKey;
            return (
              <div key={a.id} className="flex items-center gap-1 text-[10px] leading-tight">
                <span className="font-medium text-foreground">{name}</span>
                {(proto || detail) && (
                  <span className="text-muted-foreground">
                    {proto && <span className="font-mono">{proto}</span>}
                    {detail && <span className="font-mono ml-0.5">{detail}</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // MCR events: show taker name + actual_channel_id
    if (bta.length > 0) {
      return (
        <div className="flex flex-col gap-0.5">
          {bta.map((a, i) => {
            const name = (a as any).taker_name || `Slot ${a.slot_number}`;
            const chId = a.actual_channel_id || "";
            return (
              <div key={a.id} className="flex items-center gap-1 text-[10px] leading-tight">
                <span className="font-medium text-foreground">{name}</span>
                {chId && <span className="text-muted-foreground font-mono">{chId}</span>}
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback: taker_assignments for MCR
    return (
      <div className="flex flex-col gap-0.5">
        {ta.map((a, i) => {
          const name = a.taker_name || (a as any).taker_custom_name || `Taker ${i + 1}`;
          const chId = a.stream_key_or_channel_id || "";
          return (
            <div key={a.id} className="flex items-center gap-1 text-[10px] leading-tight">
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
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-1.5 text-left font-semibold w-[55px]">Type</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[95px]">Date</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[50px]">GMT</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[50px]">CET</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[140px]">Event</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[80px]">League</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Takers</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[90px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-4 text-center text-xs text-muted-foreground">No events</td></tr>
                ) : (
                  items.map((b) => {
                    const cat = (b as any)._category || "MCR";
                    const isAdv = cat !== "MCR";
                    return (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5">
                          {isAdv ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{cat}</Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">MCR</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                          {b.date}
                          {(b as any).date_to && (b as any).date_to !== b.date && (
                            <span className="text-muted-foreground ml-0.5">→{(b as any).date_to.slice(5)}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap">{b.gmt_time?.slice(0, 5)}</td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap">{b.cet_time?.slice(0, 5) ?? ""}</td>
                        <td className="px-3 py-1.5 text-xs font-medium truncate max-w-[140px]" title={b.event_name}>{b.event_name}</td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">{b.league_id ? leagueMap[b.league_id] ?? "" : ""}</td>
                        <td className="px-3 py-1.5">{renderTakerDetails(b.id, isAdv)}</td>
                        <td className="px-3 py-1.5">{getStatusBadge(b.id)}</td>
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
    </div>
  );
}

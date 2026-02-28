import React, { useState, useMemo } from "react";
import { format, isToday, isFuture, isPast, parseISO } from "date-fns";
import { Calendar, Clock, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { useBookings, Booking } from "@/hooks/useBookings";
import { useLeagues, useCategories } from "@/hooks/useLookups";
import { useTakerAssignments, TakerAssignment } from "@/hooks/useTakerAssignments";
import { Badge } from "@/components/ui/badge";

type Section = "today" | "upcoming" | "past";

export default function McrPage() {
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(["today", "upcoming"]));
  const [dateFrom, setDateFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Fetch ALL bookings (no category filter) 
  const filters = useMemo(() => {
    if (showAll) return {};
    return { dateFrom };
  }, [showAll, dateFrom]);

  const { data: bookings = [], isLoading } = useBookings(filters);
  const { data: leagues = [] } = useLeagues(true);
  const { data: categories = [] } = useCategories(true);

  // Get all booking IDs for taker assignments
  const bookingIds = useMemo(() => bookings.map((b) => b.id), [bookings]);
  const { data: assignments = [] } = useTakerAssignments(bookingIds);

  // Group assignments by booking
  const assignmentsByBooking = useMemo(() => {
    const map: Record<string, TakerAssignment[]> = {};
    for (const a of assignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [assignments]);

  const leagueMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const l of leagues) m[l.id] = l.name;
    return m;
  }, [leagues]);

  // Group bookings
  const grouped = useMemo(() => {
    const today: Booking[] = [];
    const upcoming: Booking[] = [];
    const past: Booking[] = [];

    for (const b of bookings) {
      const d = parseISO(b.date);
      if (isToday(d)) today.push(b);
      else if (isFuture(d)) upcoming.push(b);
      else past.push(b);
    }

    return { today, upcoming, past };
  }, [bookings]);

  const toggleSection = (s: Section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const getTestStatusBadge = (bookingAssignments: TakerAssignment[]) => {
    if (bookingAssignments.length === 0) return <Badge variant="outline" className="text-[9px] px-1 py-0">No takers</Badge>;
    const tested = bookingAssignments.filter((a) => a.test_status === "tested").length;
    const total = bookingAssignments.length;
    if (tested === total) return <Badge className="text-[9px] px-1 py-0 bg-green-500/15 text-green-600 border-green-500/30">All tested</Badge>;
    if (tested > 0) return <Badge className="text-[9px] px-1 py-0 bg-yellow-500/15 text-yellow-600 border-yellow-500/30">{tested}/{total} tested</Badge>;
    return <Badge variant="destructive" className="text-[9px] px-1 py-0">Not tested</Badge>;
  };

  const renderSection = (title: string, key: Section, items: Booking[], color: string) => {
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
                  <th className="px-3 py-1.5 text-left font-semibold w-[100px]">Date</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[70px]">Time</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[70px]">CET</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Event</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[100px]">League</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[100px]">Venue</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[140px]">Takers</th>
                  <th className="px-3 py-1.5 text-left font-semibold w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-4 text-center text-xs text-muted-foreground">No events</td></tr>
                ) : (
                  items.map((b) => {
                    const ba = assignmentsByBooking[b.id] ?? [];
                    const takerNames = ba
                      .map((a) => a.taker_name || (a as any).taker_custom_name || "?")
                      .filter(Boolean);
                    return (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap">{b.date}</td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap">{b.gmt_time?.slice(0, 5)}</td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap">{b.cet_time?.slice(0, 5) ?? ""}</td>
                        <td className="px-3 py-1.5 text-xs font-medium">{b.event_name}</td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">{b.league_id ? leagueMap[b.league_id] ?? "" : ""}</td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">{b.venue ?? ""}</td>
                        <td className="px-3 py-1.5 text-xs">
                          {takerNames.length > 0 ? (
                            <span className="truncate block max-w-[130px]" title={takerNames.join(", ")}>{takerNames.join(", ")}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">{getTestStatusBadge(ba)}</td>
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <label className="text-[10px] text-muted-foreground uppercase font-semibold">From</label>
        <input
          type="date"
          className="text-xs border border-input rounded px-2 py-1 bg-background"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setShowAll(false); }}
        />
        <button
          onClick={() => setShowAll(!showAll)}
          className={`text-[10px] px-2 py-1 rounded border transition-colors ${
            showAll ? "bg-primary/10 text-primary border-primary/30" : "border-input text-muted-foreground hover:text-foreground"
          }`}
        >
          Show all
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {bookings.length} events total
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading events...</div>
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

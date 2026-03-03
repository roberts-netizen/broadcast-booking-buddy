import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import BookingsGrid from "@/components/BookingsGrid";
import { useBookings, Booking } from "@/hooks/useBookings";
import { useCategories, useLeagues } from "@/hooks/useLookups";
import { useTakerAssignments, TakerAssignment } from "@/hooks/useTakerAssignments";
import { Badge } from "@/components/ui/badge";

export default function McrPage() {
  const { data: categories = [] } = useCategories(true);
  const advCategories = useMemo(() => categories.filter((c) => c.type === "advanced"), [categories]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* MCR events — full BookingsGrid interface */}
      <div className="flex-1 overflow-hidden">
        <BookingsGrid category="MCR" />
      </div>

      {/* ADV category summaries — collapsed minimal view */}
      {advCategories.length > 0 && (
        <div className="border-t border-border shrink-0">
          {advCategories.map((cat) => (
            <AdvCollapsedSection key={cat.id} category={cat.name} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdvCollapsedSection({ category }: { category: string }) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings = [] } = useBookings({ tournamentType: category });
  const { data: leagues = [] } = useLeagues(true);

  const leagueMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const l of leagues) m[l.id] = l.name;
    return m;
  }, [leagues]);

  // Only show today + upcoming (use date_to for multi-day events)
  const relevantBookings = useMemo(
    () => bookings.filter((b) => (b.date_to || b.date) >= today).slice(0, 20),
    [bookings, today]
  );

  const bookingIds = useMemo(() => relevantBookings.map((b) => b.id), [relevantBookings]);
  const { data: assignments = [] } = useTakerAssignments(bookingIds);

  const assignmentsByBooking = useMemo(() => {
    const map: Record<string, TakerAssignment[]> = {};
    for (const a of assignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [assignments]);

  const todayCount = relevantBookings.filter((b) => b.date === today).length;
  const upcomingCount = relevantBookings.filter((b) => b.date > today).length;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors text-muted-foreground"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">ADV</Badge>
        {category}
        <span className="font-normal ml-1">
          ({todayCount} today, {upcomingCount} upcoming)
        </span>
      </button>
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-1 text-left font-semibold w-[90px]">Date</th>
                <th className="px-3 py-1 text-left font-semibold w-[60px]">GMT</th>
                <th className="px-3 py-1 text-left font-semibold">Event</th>
                <th className="px-3 py-1 text-left font-semibold w-[100px]">League</th>
                <th className="px-3 py-1 text-left font-semibold w-[120px]">Takers</th>
                <th className="px-3 py-1 text-left font-semibold w-[90px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {relevantBookings.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-3 text-center text-xs text-muted-foreground">No events</td></tr>
              ) : (
                relevantBookings.map((b) => {
                  const ba = assignmentsByBooking[b.id] ?? [];
                  const takerNames = ba
                    .map((a) => a.taker_name || (a as any).taker_custom_name || "?")
                    .filter(Boolean);
                  const tested = ba.filter((a) => a.test_status === "tested").length;
                  return (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-1 text-xs whitespace-nowrap">{b.date}</td>
                      <td className="px-3 py-1 text-xs whitespace-nowrap">{b.gmt_time?.slice(0, 5)}</td>
                      <td className="px-3 py-1 text-xs font-medium">{b.event_name}</td>
                      <td className="px-3 py-1 text-xs text-muted-foreground">{b.league_id ? leagueMap[b.league_id] ?? "" : ""}</td>
                      <td className="px-3 py-1 text-xs">
                        {takerNames.length > 0 ? (
                          <span className="truncate block max-w-[110px]" title={takerNames.join(", ")}>{takerNames.join(", ")}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1">
                        {ba.length === 0 ? (
                          <Badge variant="outline" className="text-[9px] px-1 py-0">—</Badge>
                        ) : tested === ba.length ? (
                          <Badge className="text-[9px] px-1 py-0 bg-green-500/15 text-green-600 border-green-500/30">✓</Badge>
                        ) : (
                          <Badge className="text-[9px] px-1 py-0 bg-yellow-500/15 text-yellow-600 border-yellow-500/30">{tested}/{ba.length}</Badge>
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
}

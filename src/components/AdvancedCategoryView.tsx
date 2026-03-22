import React, { useState, useMemo, useEffect, useRef } from "react";
import { Plus, LayoutList, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookings, useCreateBooking, Booking } from "@/hooks/useBookings";
import { useLeagues } from "@/hooks/useLookups";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedBookingView } from "./AdvancedBookingView";
import BookingFilters from "./BookingFilters";
import { PMBookingView } from "./PMBookingView";

type Props = {
  category: string;
  highlightBookingId?: string | null;
  onHighlightHandled?: () => void;
};

type TimeTab = "today" | "upcoming" | "past";

export function AdvancedCategoryView({ category, highlightBookingId, onHighlightHandled }: Props) {
  const [filters, setFilters] = useState<{ dateFrom?: string; dateTo?: string; leagueId?: string }>({});
  const [timeTab, setTimeTab] = useState<TimeTab>("today");
  const { data: bookings = [], isLoading } = useBookings({ ...filters, tournamentType: category });
  const { data: leagues = [] } = useLeagues(true);
  const createBooking = useCreateBooking();

  // Fetch tournaments for this category so we can assign tournament_id to new bookings
  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id")
        .eq("type", category);
      if (error) throw error;
      return data;
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  // Highlight & scroll to booking from MCR shortcut
  useEffect(() => {
    if (!highlightBookingId || !bookings.length) return;
    // Switch to the tab that contains the booking
    const b = bookings.find((bk) => bk.id === highlightBookingId);
    if (!b) return;
    const endDate = b.date_to || b.date;
    if (b.date <= today && endDate >= today) setTimeTab("today");
    else if (b.date > today) setTimeTab("upcoming");
    else setTimeTab("past");
    setTimeout(() => {
      document.getElementById(`booking-${highlightBookingId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => onHighlightHandled?.(), 2000);
    }, 300);
  }, [highlightBookingId, bookings, today, onHighlightHandled]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const startDate = b.date;
      const endDate = b.date_to || b.date;
      if (timeTab === "today") return startDate <= today && endDate >= today;
      if (timeTab === "upcoming") return startDate > today;
      if (timeTab === "past") return endDate < today;
      return true;
    });
  }, [bookings, timeTab, today]);

  const handleAdd = () => {
    createBooking.mutate({
      event_name: "New Event",
      date: new Date().toISOString().slice(0, 10),
      gmt_time: "12:00",
      work_order_id: "",
      ...(tournaments.length > 0 ? { tournament_id: tournaments[0].id } : {}),
    });
  };

  const tabs: { key: TimeTab; label: string; count: number }[] = [
    { key: "today", label: "Today", count: bookings.filter((b) => b.date <= today && (b.date_to || b.date) >= today).length },
    { key: "upcoming", label: "Upcoming", count: bookings.filter((b) => b.date > today).length },
    { key: "past", label: "Past Events", count: bookings.filter((b) => (b.date_to || b.date) < today).length },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        {/* Time tabs */}
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

        <BookingFilters
          leagues={leagues}
          filters={filters}
          onChange={setFilters}
        />
        <div className="ml-auto">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleAdd}>
            <Plus className="h-3 w-3" /> Add Event
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No bookings found</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                id={`booking-${booking.id}`}
                className={highlightBookingId === booking.id ? "ring-2 ring-primary bg-primary/5 transition-all" : ""}
              >
                <AdvancedBookingView booking={booking} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

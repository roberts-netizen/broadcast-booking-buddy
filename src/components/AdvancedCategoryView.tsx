import React, { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookings, useCreateBooking, Booking } from "@/hooks/useBookings";
import { useLeagues } from "@/hooks/useLookups";
import { AdvancedBookingView } from "./AdvancedBookingView";
import BookingFilters from "./BookingFilters";

type Props = {
  category: string;
};

type TimeTab = "today" | "upcoming" | "past";

export function AdvancedCategoryView({ category }: Props) {
  const [filters, setFilters] = useState<{ dateFrom?: string; dateTo?: string; leagueId?: string }>({});
  const [timeTab, setTimeTab] = useState<TimeTab>("today");
  const { data: bookings = [], isLoading } = useBookings({ ...filters, tournamentType: category });
  const { data: leagues = [] } = useLeagues(true);
  const createBooking = useCreateBooking();

  const today = new Date().toISOString().slice(0, 10);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const d = b.date;
      if (timeTab === "today") return d === today;
      if (timeTab === "upcoming") return d > today;
      if (timeTab === "past") return d < today;
      return true;
    });
  }, [bookings, timeTab, today]);

  const handleAdd = () => {
    createBooking.mutate({
      event_name: "New Event",
      date: new Date().toISOString().slice(0, 10),
      gmt_time: "12:00",
      work_order_id: "",
    });
  };

  const tabs: { key: TimeTab; label: string; count: number }[] = [
    { key: "today", label: "Today", count: bookings.filter((b) => b.date === today).length },
    { key: "upcoming", label: "Upcoming", count: bookings.filter((b) => b.date > today).length },
    { key: "past", label: "Past Events", count: bookings.filter((b) => b.date < today).length },
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
              <div key={booking.id}>
                <AdvancedBookingView booking={booking} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

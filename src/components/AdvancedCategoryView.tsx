import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookings, useCreateBooking, Booking } from "@/hooks/useBookings";
import { useLeagues } from "@/hooks/useLookups";
import { AdvancedBookingView } from "./AdvancedBookingView";
import BookingFilters from "./BookingFilters";

type Props = {
  category: string;
};

export function AdvancedCategoryView({ category }: Props) {
  const [filters, setFilters] = useState<{ dateFrom?: string; dateTo?: string; leagueId?: string }>({});
  const { data: bookings = [], isLoading } = useBookings({ ...filters, tournamentType: category });
  const { data: leagues = [] } = useLeagues(true);
  const createBooking = useCreateBooking();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    createBooking.mutate({
      event_name: "New Event",
      date: new Date().toISOString().slice(0, 10),
      gmt_time: "12:00",
      work_order_id: "",
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <BookingFilters
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
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No bookings found</div>
        ) : (
          <div className="divide-y divide-border">
            {bookings.map((booking) => {
              const isExpanded = expandedIds.has(booking.id);
              return (
                <div key={booking.id}>
                  <button
                    onClick={() => toggleExpand(booking.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-medium text-foreground">{booking.event_name}</span>
                    <span className="text-muted-foreground ml-2">{booking.date}</span>
                    <span className="text-muted-foreground">{booking.gmt_time}</span>
                    {booking.venue && <span className="text-muted-foreground ml-auto">{booking.venue}</span>}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border">
                      <AdvancedBookingView
                        booking={booking}
                        onBack={() => toggleExpand(booking.id)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

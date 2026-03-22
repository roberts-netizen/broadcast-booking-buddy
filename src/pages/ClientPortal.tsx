import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  useClientToken,
  useLeagueTagsForTCM,
  useAvailableBookings,
  useExistingAssignments,
  useClientBookGame,
} from "@/hooks/useClientPortal";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const { data: tokenData, isLoading: tokenLoading } = useClientToken(token ?? "");

  const tcmId = tokenData?.taker_channel_maps?.id;
  const tcmLabel = tokenData?.taker_channel_maps?.label;
  const takerId = tokenData?.taker_channel_maps?.taker_id ?? null;
  const actualChannelId = tokenData?.taker_channel_maps?.actual_channel_id ?? "";

  const { data: leagueTags = [] } = useLeagueTagsForTCM(tcmId);
  const leagueIds = useMemo(() => leagueTags.map((t: any) => t.league_id), [leagueTags]);
  const leagueMap = useMemo(() => {
    const m: Record<string, string> = {};
    leagueTags.forEach((t: any) => {
      if (t.leagues) m[t.league_id] = t.leagues.name;
    });
    return m;
  }, [leagueTags]);

  const { data: bookings = [] } = useAvailableBookings(leagueIds);
  const bookingIds = useMemo(() => bookings.map((b: any) => b.id), [bookings]);
  const { data: assignments = [] } = useExistingAssignments(bookingIds);

  const bookMutation = useClientBookGame();

  // Check if this taker already booked a specific game
  const isBooked = (bookingId: string) => {
    if (!tcmId) return false;
    return assignments.some(
      (a: any) => a.booking_id === bookingId && a.taker_channel_map_id === tcmId
    );
  };

  const handleBook = (bookingId: string) => {
    if (!tcmId) return;
    bookMutation.mutate(
      {
        bookingId,
        takerId,
        takerChannelMapId: tcmId,
        actualChannelId,
      },
      {
        onSuccess: () => toast({ title: "Booked!", description: "You've been assigned to this game." }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold">Invalid or Expired Link</h1>
          <p className="text-sm text-muted-foreground">This access link is no longer valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Available Games</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Channel: <span className="font-semibold text-foreground">{tcmLabel}</span>
          </p>
          {leagueTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {leagueTags.map((t: any) => (
                <span
                  key={t.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {t.leagues?.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Games Table */}
        {bookings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No upcoming games available for your leagues.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Time (CET)</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">League</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Event</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => {
                  const booked = isBooked(b.id);
                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-border last:border-b-0 ${
                        booked ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {format(new Date(b.date + "T00:00:00"), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {b.cet_time ? b.cet_time.slice(0, 5) : b.gmt_time?.slice(0, 5) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {b.league_id ? leagueMap[b.league_id] ?? "" : ""}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{b.event_name || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {booked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary">
                            <Check className="h-3 w-3" /> Booked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleBook(b.id)}
                            disabled={bookMutation.isPending}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            {bookMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Book"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useCallback, useMemo } from "react";
import { Trash2, Plus, Check } from "lucide-react";
import { useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, Booking } from "@/hooks/useBookings";
import { useLeagues, useIncomingChannels, useTakers } from "@/hooks/useLookups";
import { useTakerAssignments, TakerAssignment } from "@/hooks/useTakerAssignments";
import { TakersCell } from "@/components/TakersCell";
import BookingFilters from "./BookingFilters";

function addOneHour(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

type CellSelectProps = {
  value: string | null;
  options: { id: string; name: string }[];
  onChange: (val: string | null) => void;
  placeholder?: string;
};

function CellSelect({ value, options, onChange, placeholder = "—" }: CellSelectProps) {
  return (
    <select
      className="grid-cell-input cursor-pointer"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  );
}

// ── Single booking row ───────────────────────────────────────────────────────
type BookingRowProps = {
  booking: Booking;
  leagues: { id: string; name: string }[];
  channels: { id: string; name: string }[];
  takers: { id: string; name: string }[];
  assignments: TakerAssignment[];
  onDelete: (id: string) => void;
};

function BookingRow({
  booking,
  leagues,
  channels,
  takers,
  assignments,
  onDelete,
}: BookingRowProps) {
  const update = useUpdateBooking();
  const [local, setLocal] = useState<Partial<Booking>>({});
  const [cetOverride, setCetOverride] = useState(false);

  const get = <K extends keyof Booking>(key: K): Booking[K] =>
    (key in local ? (local as Booking)[key] : booking[key]);

  const patch = useCallback(
    (fields: Partial<Booking>) => {
      setLocal((prev) => ({ ...prev, ...fields }));
      update.mutate({ id: booking.id, ...fields });
    },
    [booking.id, update]
  );

  const gmtTime = get("gmt_time");
  const cetTime = get("cet_time");
  const workOrderId = get("work_order_id") ?? "";
  const confirmation = workOrderId.trim() !== "" ? "yes" : "";

  return (
    <tr className="grid-row group">
      {/* ── Core booking fields ── */}
      <td className="px-1 py-0.5 border-r border-border whitespace-nowrap">
        <input
          type="date"
          className="grid-cell-input"
          value={get("date") ?? ""}
          onChange={(e) => patch({ date: e.target.value })}
        />
      </td>
      <td className="px-1 py-0.5 border-r border-border">
        <input
          type="time"
          className="grid-cell-input"
          value={formatTime(get("gmt_time"))}
          onChange={(e) => {
            const v = e.target.value;
            patch({ gmt_time: v, ...(cetOverride ? {} : { cet_time: addOneHour(v) }) });
          }}
        />
      </td>
      <td className="px-1 py-0.5 border-r border-border">
        <input
          type="time"
          className="grid-cell-input"
          value={formatTime(cetTime ?? (gmtTime ? addOneHour(gmtTime) : ""))}
          onChange={(e) => {
            setCetOverride(true);
            patch({ cet_time: e.target.value });
          }}
        />
      </td>
      <td className="px-1 py-0.5 border-r border-border min-w-[110px]">
        <CellSelect
          value={get("league_id")}
          options={leagues}
          onChange={(v) => patch({ league_id: v })}
          placeholder="— league —"
        />
      </td>
      <td className="px-1 py-0.5 border-r border-border min-w-[160px]">
        <input
          type="text"
          className="grid-cell-input"
          value={get("event_name") ?? ""}
          onChange={(e) => patch({ event_name: e.target.value })}
          placeholder="Event name…"
        />
      </td>
      <td className="px-1 py-0.5 border-r border-border min-w-[110px]">
        <CellSelect
          value={get("incoming_channel_id")}
          options={channels}
          onChange={(v) => patch({ incoming_channel_id: v })}
          placeholder="— channel —"
        />
      </td>
      <td className="px-1 py-0.5 border-r border-border min-w-[90px]">
        <input
          type="text"
          className="grid-cell-input"
          value={workOrderId}
          onChange={(e) => patch({ work_order_id: e.target.value })}
          placeholder="WO-…"
        />
      </td>
      <td className="px-2 py-0.5 border-r border-border text-center w-14">
        {confirmation && (
          <span className="inline-flex items-center gap-0.5 text-[hsl(var(--confirmation-yes))] font-semibold text-xs">
            <Check className="h-3 w-3" /> yes
          </span>
        )}
      </td>

      {/* ── Takers column ── */}
      <TakersCell
        bookingId={booking.id}
        bookingLabel={booking.event_name || booking.date}
        assignments={assignments}
        takers={takers}
      />

      {/* ── Delete ── */}
      <td className="px-1 py-0.5 text-center w-8">
        <button
          onClick={() => onDelete(booking.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ── Grid ─────────────────────────────────────────────────────────────────────
export default function BookingsGrid() {
  const [filters, setFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    leagueId?: string;
  }>({});

  const { data: bookings = [], isLoading } = useBookings(filters);
  const { data: leagues = [] } = useLeagues(true);
  const { data: channels = [] } = useIncomingChannels(true);
  const { data: takers = [] } = useTakers(true);

  const bookingIds = useMemo(() => bookings.map((b) => b.id), [bookings]);
  const { data: allAssignments = [] } = useTakerAssignments(bookingIds);

  // Group: bookingId → [assignments]
  const assignmentMap = useMemo(() => {
    const map: Record<string, TakerAssignment[]> = {};
    for (const a of allAssignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [allAssignments]);

  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();

  const handleAddRow = () => {
    const today = new Date().toISOString().split("T")[0];
    createBooking.mutate({
      date: today,
      gmt_time: "00:00",
      cet_time: "01:00",
      event_name: "",
      work_order_id: "",
    });
  };

  const typedTakers = (takers as any[]).map((t) => ({ id: t.id as string, name: t.name as string }));

  // ── Header helpers ──
  const TH = ({
    children,
    cls = "",
    style,
  }: {
    children?: React.ReactNode;
    cls?: string;
    style?: React.CSSProperties;
  }) => (
    <th
      style={style}
      className={`px-2 py-1.5 text-left text-xs font-semibold tracking-wide border-r border-[rgba(255,255,255,0.15)] last:border-r-0 whitespace-nowrap ${cls}`}
    >
      {children}
    </th>
  );

  const gridHeaderStyle: React.CSSProperties = {
    background: "hsl(var(--grid-header))",
    color: "hsl(var(--grid-header-foreground))",
  };

  return (
    <div className="flex flex-col h-full">
      <BookingFilters leagues={leagues} filters={filters} onChange={setFilters} />

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: 900 }}>
          <thead>
            <tr style={gridHeaderStyle}>
              <TH cls="min-w-[100px]">Date</TH>
              <TH>GMT</TH>
              <TH>CET</TH>
              <TH cls="min-w-[110px]">League</TH>
              <TH cls="min-w-[160px]">Event Name</TH>
              <TH cls="min-w-[110px]">Incoming Ch.</TH>
              <TH cls="min-w-[90px]">Work Order</TH>
              <TH cls="w-14 text-center">Conf.</TH>
              <TH cls="min-w-[180px] border-l-2 border-[rgba(255,255,255,0.25)]">Takers</TH>
              <TH cls="w-8 border-r-0"></TH>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && bookings.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-muted-foreground">
                  No bookings found. Add one below.
                </td>
              </tr>
            )}
            {bookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                leagues={leagues}
                channels={channels}
                takers={typedTakers}
                assignments={assignmentMap[b.id] ?? []}
                onDelete={(id) => deleteBooking.mutate(id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border p-2 shrink-0">
        <button
          onClick={handleAddRow}
          disabled={createBooking.isPending}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add booking
        </button>
      </div>
    </div>
  );
}

import React, { useState, useCallback } from "react";
import { Trash2, Plus, Check, X } from "lucide-react";
import { useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, Booking } from "@/hooks/useBookings";
import { useLeagues, useIncomingChannels, useTakers, useTakerChannelMaps } from "@/hooks/useLookups";
import BookingFilters from "./BookingFilters";

// Helper: add 1 hour to a time string (HH:MM or HH:MM:SS)
function addOneHour(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTime(t: string | null): string {
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

type BookingRowProps = {
  booking: Booking;
  leagues: { id: string; name: string }[];
  channels: { id: string; name: string }[];
  takers: { id: string; name: string }[];
  takerMaps: { id: string; label: string; actual_channel_id: string; taker_id: string | null }[];
  onDelete: (id: string) => void;
};

function BookingRow({ booking, leagues, channels, takers, takerMaps, onDelete }: BookingRowProps) {
  const update = useUpdateBooking();
  const [local, setLocal] = useState<Partial<Booking>>({});
  const [cetOverride, setCetOverride] = useState(false);

  const get = <K extends keyof Booking>(key: K): Booking[K] => (key in local ? (local as Booking)[key] : booking[key]);

  const patch = useCallback((fields: Partial<Booking>) => {
    setLocal((prev) => ({ ...prev, ...fields }));
    update.mutate({ id: booking.id, ...fields });
  }, [booking.id, update]);

  const gmtTime = get("gmt_time");
  const cetTime = get("cet_time");
  const workOrderId = get("work_order_id") ?? "";
  const confirmation = workOrderId.trim() !== "" ? "yes" : "";
  const takerMapId = get("taker_channel_map_id");
  const selectedMap = takerMaps.find((m) => m.id === takerMapId);
  const actualChannelId = selectedMap?.actual_channel_id ?? "";

  // Filter taker maps by selected taker
  const takerId = get("taker_id");
  const filteredMaps = takerMaps.filter((m) => !takerId || m.taker_id === takerId);

  return (
    <tr className="grid-row group">
      {/* Date */}
      <td className="px-1 py-0.5 border-r border-border whitespace-nowrap">
        <input
          type="date"
          className="grid-cell-input"
          value={get("date") ?? ""}
          onChange={(e) => patch({ date: e.target.value })}
        />
      </td>
      {/* GMT Time */}
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
      {/* CET Time */}
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
      {/* League */}
      <td className="px-1 py-0.5 border-r border-border min-w-[120px]">
        <CellSelect value={get("league_id")} options={leagues} onChange={(v) => patch({ league_id: v })} placeholder="— league —" />
      </td>
      {/* Event Name */}
      <td className="px-1 py-0.5 border-r border-border min-w-[160px]">
        <input
          type="text"
          className="grid-cell-input"
          value={get("event_name") ?? ""}
          onChange={(e) => patch({ event_name: e.target.value })}
          placeholder="Event name…"
        />
      </td>
      {/* Incoming Channel */}
      <td className="px-1 py-0.5 border-r border-border min-w-[120px]">
        <CellSelect value={get("incoming_channel_id")} options={channels} onChange={(v) => patch({ incoming_channel_id: v })} placeholder="— channel —" />
      </td>
      {/* Work Order */}
      <td className="px-1 py-0.5 border-r border-border">
        <input
          type="text"
          className="grid-cell-input"
          value={workOrderId}
          onChange={(e) => patch({ work_order_id: e.target.value })}
          placeholder="WO-…"
        />
      </td>
      {/* Confirmation */}
      <td className="px-1 py-0.5 border-r border-border text-center">
        {confirmation ? (
          <span className="inline-flex items-center gap-0.5 text-[hsl(var(--confirmation-yes))] font-semibold text-xs">
            <Check className="h-3 w-3" /> yes
          </span>
        ) : null}
      </td>
      {/* Taker */}
      <td className="px-1 py-0.5 border-r border-border min-w-[120px]">
        <CellSelect
          value={get("taker_id")}
          options={takers}
          onChange={(v) => patch({ taker_id: v, taker_channel_map_id: null })}
          placeholder="— taker —"
        />
      </td>
      {/* Taker Channel Label */}
      <td className="px-1 py-0.5 border-r border-border min-w-[110px]">
        <CellSelect
          value={get("taker_channel_map_id")}
          options={filteredMaps.map((m) => ({ id: m.id, name: m.label }))}
          onChange={(v) => patch({ taker_channel_map_id: v })}
          placeholder="— label —"
        />
      </td>
      {/* Actual Channel ID (read-only) */}
      <td className="px-2 py-0.5 border-r border-border text-muted-foreground font-mono text-xs whitespace-nowrap">
        {actualChannelId}
      </td>
      {/* Delete */}
      <td className="px-1 py-0.5 text-center">
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

export default function BookingsGrid() {
  const [filters, setFilters] = useState<{ dateFrom?: string; dateTo?: string; leagueId?: string }>({});
  const { data: bookings = [], isLoading } = useBookings(filters);
  const { data: leagues = [] } = useLeagues(true);
  const { data: channels = [] } = useIncomingChannels(true);
  const { data: takers = [] } = useTakers(true);
  const { data: takerMaps = [] } = useTakerChannelMaps(true);

  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();

  const handleAddRow = () => {
    const today = new Date().toISOString().split("T")[0];
    createBooking.mutate({ date: today, gmt_time: "00:00", cet_time: "01:00", event_name: "", work_order_id: "" });
  };

  const col = (label: string, cls = "") => (
    <th className={`px-2 py-2 text-left text-xs font-semibold tracking-wide border-r border-[hsl(var(--grid-header)/0.3)] last:border-r-0 whitespace-nowrap ${cls}`}>
      {label}
    </th>
  );

  return (
    <div className="flex flex-col h-full">
      <BookingFilters
        leagues={leagues}
        filters={filters}
        onChange={setFilters}
      />

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: 1100 }}>
          <thead>
            <tr style={{ background: "hsl(var(--grid-header))", color: "hsl(var(--grid-header-foreground))" }}>
              {col("Date")}
              {col("GMT")}
              {col("CET")}
              {col("League")}
              {col("Event Name", "min-w-[160px]")}
              {col("Incoming Ch.")}
              {col("Work Order")}
              {col("Conf.")}
              {col("Taker")}
              {col("Ch. Label")}
              {col("Actual Ch. ID")}
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={12} className="text-center py-8 text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!isLoading && bookings.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-8 text-muted-foreground">No bookings. Add one below.</td>
              </tr>
            )}
            {bookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                leagues={leagues}
                channels={channels}
                takers={takers}
                takerMaps={takerMaps}
                onDelete={(id) => deleteBooking.mutate(id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border p-2">
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

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  useUpsertBookingTakerAssignment,
  useClearBookingTakerAssignment,
  BookingTakerAssignment,
} from "@/hooks/useBookingTakerAssignments";

type TakerMap = { id: string; label: string; actual_channel_id: string; taker_id: string | null };

type Props = {
  slotNumber: number;
  bookingId: string;
  assignment: BookingTakerAssignment | null | undefined;
  takers: { id: string; name: string }[];
  takerMaps: TakerMap[];
};

export function TakerSlot({ slotNumber, bookingId, assignment, takers, takerMaps }: Props) {
  const upsert = useUpsertBookingTakerAssignment();
  const clear = useClearBookingTakerAssignment();

  const [localTakerId, setLocalTakerId] = useState<string | null>(assignment?.taker_id ?? null);
  const [localMapId, setLocalMapId] = useState<string | null>(assignment?.taker_channel_map_id ?? null);
  const [localActualCh, setLocalActualCh] = useState<string>(assignment?.actual_channel_id ?? "");

  useEffect(() => {
    setLocalTakerId(assignment?.taker_id ?? null);
    setLocalMapId(assignment?.taker_channel_map_id ?? null);
    setLocalActualCh(assignment?.actual_channel_id ?? "");
  }, [assignment?.taker_id, assignment?.taker_channel_map_id, assignment?.actual_channel_id]);

  const filteredMaps = takerMaps.filter((m) => !localTakerId || m.taker_id === localTakerId);
  const isEmpty = !localTakerId && !localMapId;

  const handleTakerChange = (newTakerId: string | null) => {
    setLocalTakerId(newTakerId);
    setLocalMapId(null);
    setLocalActualCh("");

    if (!newTakerId) {
      clear.mutate({ bookingId, slotNumber });
    } else {
      upsert.mutate({
        bookingId,
        slotNumber,
        takerId: newTakerId,
        takerChannelMapId: null,
        actualChannelId: "",
      });
    }
  };

  const handleMapChange = (newMapId: string | null) => {
    const selectedMap = newMapId ? takerMaps.find((m) => m.id === newMapId) : null;
    const actualCh = selectedMap?.actual_channel_id ?? "";

    setLocalMapId(newMapId);
    setLocalActualCh(actualCh);

    if (!newMapId && !localTakerId) {
      clear.mutate({ bookingId, slotNumber });
    } else {
      upsert.mutate({
        bookingId,
        slotNumber,
        takerId: localTakerId,
        takerChannelMapId: newMapId,
        actualChannelId: actualCh,
      });
    }
  };

  const handleClear = () => {
    setLocalTakerId(null);
    setLocalMapId(null);
    setLocalActualCh("");
    clear.mutate({ bookingId, slotNumber });
  };

  return (
    <td className="px-1 py-0.5 border-r border-border align-top" style={{ minWidth: 140, maxWidth: 180 }}>
      {isEmpty ? (
        /* ── Empty placeholder ── */
        <div className="flex items-center justify-center h-full min-h-[36px]">
          <select
            className="grid-cell-input cursor-pointer text-muted-foreground"
            value=""
            onChange={(e) => handleTakerChange(e.target.value || null)}
          >
            <option value="">+ Add taker</option>
            {takers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      ) : (
        /* ── Filled slot: stacked layout ── */
        <div className="flex flex-col gap-0.5 relative group/slot pr-4">
          {/* Clear button */}
          <button
            onClick={handleClear}
            className="absolute top-0 right-0 opacity-0 group-hover/slot:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded"
            title="Clear slot"
          >
            <X className="h-3 w-3" />
          </button>

          {/* Taker dropdown */}
          <select
            className="grid-cell-input cursor-pointer font-medium"
            value={localTakerId ?? ""}
            onChange={(e) => handleTakerChange(e.target.value || null)}
          >
            <option value="">—</option>
            {takers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Channel Label dropdown */}
          <select
            className="grid-cell-input cursor-pointer text-[11px] py-0 text-muted-foreground"
            value={localMapId ?? ""}
            onChange={(e) => handleMapChange(e.target.value || null)}
            disabled={filteredMaps.length === 0 && !localMapId}
          >
            <option value="">— label —</option>
            {filteredMaps.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          {/* Actual Channel ID — read-only secondary text */}
          {localActualCh ? (
            <span className="px-1 text-[10px] font-mono text-muted-foreground leading-tight truncate">
              {localActualCh}
            </span>
          ) : (
            <span className="px-1 text-[10px] text-border leading-tight select-none">—</span>
          )}
        </div>
      )}
    </td>
  );
}

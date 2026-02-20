import React, { useState, useEffect } from "react";
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

  // Local shadow state for instant UI feedback
  const [localTakerId, setLocalTakerId] = useState<string | null>(assignment?.taker_id ?? null);
  const [localMapId, setLocalMapId] = useState<string | null>(assignment?.taker_channel_map_id ?? null);
  const [localActualCh, setLocalActualCh] = useState<string>(assignment?.actual_channel_id ?? "");

  // Sync when server data changes (e.g. after refetch)
  useEffect(() => {
    setLocalTakerId(assignment?.taker_id ?? null);
    setLocalMapId(assignment?.taker_channel_map_id ?? null);
    setLocalActualCh(assignment?.actual_channel_id ?? "");
  }, [assignment?.taker_id, assignment?.taker_channel_map_id, assignment?.actual_channel_id]);

  const filteredMaps = takerMaps.filter((m) => !localTakerId || m.taker_id === localTakerId);

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

  return (
    <>
      {/* Taker */}
      <td className="px-1 py-0.5 border-r border-border min-w-[100px]">
        <select
          className="grid-cell-input cursor-pointer"
          value={localTakerId ?? ""}
          onChange={(e) => handleTakerChange(e.target.value || null)}
        >
          <option value="">—</option>
          {takers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </td>

      {/* Channel Label */}
      <td className="px-1 py-0.5 border-r border-border min-w-[90px]">
        <select
          className="grid-cell-input cursor-pointer"
          value={localMapId ?? ""}
          onChange={(e) => handleMapChange(e.target.value || null)}
          disabled={filteredMaps.length === 0 && !localMapId}
        >
          <option value="">—</option>
          {filteredMaps.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </td>

      {/* Actual Channel ID — read-only, stored for history */}
      <td className="px-2 py-0.5 border-r border-border font-mono text-xs text-muted-foreground whitespace-nowrap">
        {localActualCh || <span className="text-border select-none">—</span>}
      </td>
    </>
  );
}

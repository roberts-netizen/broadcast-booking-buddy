import React, { useState, useCallback, useMemo } from "react";

/** Extract leading number from strings like "T02-...", "CH14", "SR03" for natural sorting */
const extractNum = (s: string): number => {
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
};
const naturalSort = (a: string, b: string) => {
  const na = extractNum(a);
  const nb = extractNum(b);
  return na !== nb ? na - nb : a.localeCompare(b);
};
import { Settings2, Plus } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import {
  BookingTakerAssignment,
  useUpsertBookingTakerAssignment,
  useClearBookingTakerAssignment,
} from "@/hooks/useBookingTakerAssignments";
import { TakerAssignmentModal } from "./TakerAssignmentModal";

type TakerChannelMap = {
  id: string;
  label: string;
  actual_channel_id: string;
  taker_id: string | null;
};

type Props = {
  bookingId: string;
  bookingLabel: string;
  assignments: BookingTakerAssignment[];
  takerChannelMaps: TakerChannelMap[];
};

const DEFAULT_SLOT_COUNT = 3;

export function TakersCell({ bookingId, bookingLabel, assignments, takerChannelMaps }: Props) {
  const [open, setOpen] = useState(false);
  const maxAssignedSlot = useMemo(() => Math.max(0, ...assignments.map((a) => a.slot_number)), [assignments]);
  const [slotCount, setSlotCount] = useState(Math.max(DEFAULT_SLOT_COUNT, maxAssignedSlot));
  const upsertAssignment = useUpsertBookingTakerAssignment();
  const clearAssignment = useClearBookingTakerAssignment();

  // Get unique takers (by taker_id)
  const uniqueTakers = useMemo(() => {
    const seen = new Map<string, TakerChannelMap>();
    for (const m of takerChannelMaps) {
      const key = m.taker_id ?? m.id;
      if (!seen.has(key)) seen.set(key, m);
    }
    return Array.from(seen.values());
  }, [takerChannelMaps]);

  // Resolve taker name from taker_channel_maps data
  // We need the taker name — it's stored via the label grouping in the parent.
  // Actually the takerChannelMaps here don't have taker name directly.
  // But the taker_id groups them. We'll use taker_id as the key and show 
  // the taker name from the parent's joined data. For now we need to get taker names.
  // The parent passes takerChannelMaps which come from useTakerChannelMaps with takers(name) join.
  // But the type here only has id/label/actual_channel_id/taker_id.
  // We need to extend the type or pass taker names separately.
  // For simplicity, let's look up taker info from the assignment's taker_channel_map_id.

  // Get CHIDs for a specific taker_id
  const getChidsForTaker = useCallback(
    (takerId: string) => takerChannelMaps.filter((m) => (m.taker_id ?? m.id) === takerId),
    [takerChannelMaps]
  );

  // Map slot_number to assignment
  const slotAssignment = useCallback(
    (slotNum: number) => assignments.find((a) => a.slot_number === slotNum) ?? null,
    [assignments]
  );

  // Resolve taker_id from assignment
  const getAssignmentTakerId = useCallback(
    (a: BookingTakerAssignment | null) => {
      if (!a?.taker_channel_map_id) return "";
      const map = takerChannelMaps.find((m) => m.id === a.taker_channel_map_id);
      return map?.taker_id ?? "";
    },
    [takerChannelMaps]
  );

  const handleTakerChange = useCallback(
    (slotNum: number, takerId: string) => {
      if (!takerId) {
        clearAssignment.mutate({ bookingId, slotNumber: slotNum });
        return;
      }
      // Pick the first channel map for this taker
      const map = takerChannelMaps.find((m) => (m.taker_id ?? m.id) === takerId);
      if (!map) return;
      upsertAssignment.mutate({
        bookingId,
        slotNumber: slotNum,
        takerId: map.taker_id,
        takerChannelMapId: map.id,
        actualChannelId: map.actual_channel_id,
      });
    },
    [bookingId, takerChannelMaps, upsertAssignment, clearAssignment]
  );

  const handleChidChange = useCallback(
    (slotNum: number, mapId: string) => {
      const map = takerChannelMaps.find((m) => m.id === mapId);
      if (!map) return;
      upsertAssignment.mutate({
        bookingId,
        slotNumber: slotNum,
        takerId: map.taker_id,
        takerChannelMapId: map.id,
        actualChannelId: map.actual_channel_id,
      });
    },
    [bookingId, takerChannelMaps, upsertAssignment]
  );

  const modalTakers = useMemo(
    () => uniqueTakers.map((m) => ({ id: m.taker_id ?? m.id, name: (m as any).takers?.name ?? m.label })),
    [uniqueTakers]
  );

  // Build taker options with name from joined data
  const takerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of takerChannelMaps) {
      const key = m.taker_id ?? m.id;
      if (!seen.has(key)) {
        const name = (m as any).takers?.name ?? m.label;
        seen.set(key, name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [takerChannelMaps]);

  return (
    <>
      <div className="flex items-stretch gap-0 px-0 w-full h-full overflow-x-auto">
        {Array.from({ length: slotCount }, (_, i) => {
          const slotNum = i + 1;
          const assignment = slotAssignment(slotNum);
          const currentTakerId = getAssignmentTakerId(assignment);
          const availableChids = currentTakerId ? getChidsForTaker(currentTakerId) : [];

          return (
            <div key={i} className="flex flex-col gap-0.5 border-r-2 border-border last:border-r-0 px-1.5 py-1 w-[260px] shrink-0 bg-background even:bg-muted/20">
              <div className="flex flex-row items-center gap-1">
                <SearchableSelect
                  options={takerOptions}
                  value={currentTakerId}
                  onChange={(val) => handleTakerChange(slotNum, val)}
                  placeholder={`Taker ${slotNum}`}
                  compact
                  className="flex-1 min-w-0"
                />
                {currentTakerId && (
                  <SearchableSelect
                    options={availableChids.map((m) => ({ value: m.id, label: m.label }))}
                    value={assignment?.taker_channel_map_id ?? ""}
                    onChange={(val) => handleChidChange(slotNum, val)}
                    placeholder="CHID"
                    compact
                    className="flex-1 min-w-0 [&_button]:bg-muted/30 [&_button]:text-muted-foreground"
                  />
                )}
              </div>
              {assignment?.booked_by_client && (
                <span className="text-[8px] px-1 py-0 rounded bg-blue-500/15 text-blue-500 border border-blue-500/30 w-fit">Client</span>
              )}
            </div>
          );
        })}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSlotCount((c) => c + 1);
          }}
          className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-primary transition-colors"
          title="Add taker slot"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="flex-shrink-0 p-0.5 text-muted-foreground hover:text-primary transition-colors"
          title="Manage taker details"
        >
          <Settings2 className="h-3 w-3" />
        </button>
      </div>

      <TakerAssignmentModal
        open={open}
        onClose={() => setOpen(false)}
        bookingId={bookingId}
        bookingLabel={bookingLabel}
        assignments={[]}
        takers={modalTakers}
      />
    </>
  );
}

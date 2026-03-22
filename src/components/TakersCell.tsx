import React, { useState, useCallback, useMemo } from "react";
import { Settings2, Plus } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import {
  BookingTakerAssignment,
  useUpsertBookingTakerAssignment,
  useClearBookingTakerAssignment,
} from "@/hooks/useBookingTakerAssignments";
import { TakerAssignmentModal } from "./TakerAssignmentModal";
// Modal uses its own taker_assignments query when opened

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

  // Get unique labels
  const uniqueLabels = useMemo(() => {
    const seen = new Set<string>();
    return takerChannelMaps.filter((m) => {
      if (seen.has(m.label)) return false;
      seen.add(m.label);
      return true;
    });
  }, [takerChannelMaps]);

  // Get channels for a specific label
  const getChannelsForLabel = useCallback(
    (label: string) => takerChannelMaps.filter((m) => m.label === label),
    [takerChannelMaps]
  );

  // Map slot_number to assignment
  const slotAssignment = useCallback(
    (slotNum: number) => assignments.find((a) => a.slot_number === slotNum) ?? null,
    [assignments]
  );

  // Resolve label from taker_channel_map_id
  const getAssignmentLabel = useCallback(
    (a: BookingTakerAssignment | null) => {
      if (!a?.taker_channel_map_id) return "";
      const map = takerChannelMaps.find((m) => m.id === a.taker_channel_map_id);
      return map?.label ?? "";
    },
    [takerChannelMaps]
  );

  const handleLabelChange = useCallback(
    (slotNum: number, label: string) => {
      if (!label) {
        clearAssignment.mutate({ bookingId, slotNumber: slotNum });
        return;
      }
      // Pick the first channel map for this label
      const map = takerChannelMaps.find((m) => m.label === label);
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

  const handleChannelChange = useCallback(
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
    () => uniqueLabels.map((m) => ({ id: m.taker_id ?? m.id, name: m.label })),
    [uniqueLabels]
  );

  return (
    <>
      <div className="flex items-center gap-0 px-0 w-full h-full">
        {Array.from({ length: slotCount }, (_, i) => {
          const slotNum = i + 1;
          const assignment = slotAssignment(slotNum);
          const currentLabel = getAssignmentLabel(assignment);
          const availableChannels = currentLabel ? getChannelsForLabel(currentLabel) : [];

          return (
            <div key={i} className="flex flex-row gap-0.5 items-center border-r border-border last:border-r-0 px-1 py-0.5 w-[130px] shrink-0">
              <SearchableSelect
                options={uniqueLabels.map((m) => ({ value: m.label, label: m.label }))}
                value={currentLabel}
                onChange={(val) => handleLabelChange(slotNum, val)}
                placeholder="—"
                className="flex-1 min-w-0"
              />
              {currentLabel && (
                <SearchableSelect
                  options={availableChannels.map((m) => ({ value: m.id, label: m.actual_channel_id }))}
                  value={assignment?.taker_channel_map_id ?? ""}
                  onChange={(val) => handleChannelChange(slotNum, val)}
                  placeholder="ch"
                  className="min-w-[50px] max-w-[70px] [&_button]:text-[9px] [&_button]:py-0 [&_button]:bg-muted/30 [&_button]:text-muted-foreground"
                />
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

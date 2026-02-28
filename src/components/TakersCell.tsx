import React, { useState, useCallback, useMemo } from "react";
import { Settings2 } from "lucide-react";
import {
  BookingTakerAssignment,
  useUpsertBookingTakerAssignment,
  useClearBookingTakerAssignment,
} from "@/hooks/useBookingTakerAssignments";
import { TakerAssignmentModal } from "./TakerAssignmentModal";
import { useTakerAssignments } from "@/hooks/useTakerAssignments";

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

const SLOT_COUNT = 3;

export function TakersCell({ bookingId, bookingLabel, assignments, takerChannelMaps }: Props) {
  const [open, setOpen] = useState(false);
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

  // For modal: derive takers list from unique labels
  const modalBookingIds = useMemo(() => [bookingId], [bookingId]);
  const { data: takerAssignments = [] } = useTakerAssignments(modalBookingIds);
  const modalTakers = useMemo(
    () => uniqueLabels.map((m) => ({ id: m.taker_id ?? m.id, name: m.label })),
    [uniqueLabels]
  );

  return (
    <>
      <div className="flex items-center gap-0.5 px-0.5 w-full h-full">
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const slotNum = i + 1; // slot_number is 1-based (1, 2, 3)
          const assignment = slotAssignment(slotNum);
          const currentLabel = getAssignmentLabel(assignment);
          const availableChannels = currentLabel ? getChannelsForLabel(currentLabel) : [];
          const showChannelPicker = availableChannels.length > 1 && currentLabel;

          return (
            <div key={i} className="flex flex-col gap-0 flex-1 min-w-0">
              {/* Label dropdown */}
              <select
                className="w-full border border-input rounded-t px-0.5 py-0.5 text-[10px] bg-background focus:outline-none focus:ring-1 focus:ring-ring truncate"
                value={currentLabel}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  handleLabelChange(slotNum, e.target.value);
                }}
              >
                <option value="">—</option>
                {uniqueLabels.map((m) => (
                  <option key={m.id} value={m.label}>
                    {m.label}
                  </option>
                ))}
              </select>
              {/* Channel dropdown (shown when label is selected) */}
              {currentLabel && (
                <select
                  className="w-full border border-input border-t-0 rounded-b px-0.5 py-0 text-[9px] text-muted-foreground bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring truncate"
                  value={assignment?.taker_channel_map_id ?? ""}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleChannelChange(i, e.target.value);
                  }}
                >
                  {availableChannels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.actual_channel_id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
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
        assignments={takerAssignments}
        takers={modalTakers}
      />
    </>
  );
}

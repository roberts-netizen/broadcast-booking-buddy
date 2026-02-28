import React, { useState, useCallback } from "react";
import { Settings2 } from "lucide-react";
import { TakerAssignment, useCreateTakerAssignment, useUpdateTakerAssignment, useDeleteTakerAssignment } from "@/hooks/useTakerAssignments";
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
  assignments: TakerAssignment[];
  takerChannelMaps: TakerChannelMap[];
};

const SLOT_COUNT = 3;

export function TakersCell({ bookingId, bookingLabel, assignments, takerChannelMaps }: Props) {
  const [open, setOpen] = useState(false);
  const createAssignment = useCreateTakerAssignment();
  const updateAssignment = useUpdateTakerAssignment();
  const deleteAssignment = useDeleteTakerAssignment();

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => assignments[i] ?? null);

  // Get unique labels for dropdown display
  const uniqueLabels = React.useMemo(() => {
    const seen = new Set<string>();
    return takerChannelMaps.filter((m) => {
      if (seen.has(m.label)) return false;
      seen.add(m.label);
      return true;
    });
  }, [takerChannelMaps]);

  // Find which label an assignment matches (by taker_id or taker_channel_map_id)
  const getSlotLabel = (assignment: TakerAssignment | null): string => {
    if (!assignment) return "";
    // Try to match by taker_name first
    if (assignment.taker_name) return assignment.taker_name;
    // Try taker_id match in maps
    if (assignment.taker_id) {
      const map = takerChannelMaps.find((m) => m.taker_id === assignment.taker_id);
      if (map) return map.label;
    }
    return "";
  };

  const handleSlotChange = useCallback(
    (slotIndex: number, selectedLabel: string) => {
      const existing = assignments[slotIndex];
      if (!selectedLabel) {
        if (existing) deleteAssignment.mutate(existing.id);
        return;
      }
      // Find first matching taker_channel_map for this label
      const map = takerChannelMaps.find((m) => m.label === selectedLabel);
      if (!map) return;

      if (existing) {
        updateAssignment.mutate({
          id: existing.id,
          taker_id: map.taker_id,
        });
      } else {
        createAssignment.mutate({
          booking_id: bookingId,
          taker_id: map.taker_id,
          sort_order: slotIndex,
          test_status: "not_tested",
        });
      }
    },
    [assignments, bookingId, takerChannelMaps, createAssignment, updateAssignment, deleteAssignment]
  );

  // Derive takers list for modal compatibility
  const takers = React.useMemo(() => 
    uniqueLabels.map((m) => ({ id: m.taker_id ?? m.id, name: m.label })),
    [uniqueLabels]
  );

  return (
    <>
      <div className="flex items-center gap-1 px-1 w-full h-full">
        {slots.map((slot, i) => (
          <select
            key={i}
            className="flex-1 min-w-0 border border-input rounded px-1 py-0.5 text-[10px] bg-background focus:outline-none focus:ring-1 focus:ring-ring truncate"
            value={getSlotLabel(slot)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              handleSlotChange(i, e.target.value);
            }}
          >
            <option value="">—</option>
            {uniqueLabels.map((m) => (
              <option key={m.id} value={m.label}>
                {m.label}
              </option>
            ))}
          </select>
        ))}
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
        assignments={assignments}
        takers={takers}
      />
    </>
  );
}

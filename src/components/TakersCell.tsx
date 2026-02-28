import React, { useState, useCallback } from "react";
import { Settings2 } from "lucide-react";
import { TakerAssignment, useCreateTakerAssignment, useUpdateTakerAssignment, useDeleteTakerAssignment } from "@/hooks/useTakerAssignments";
import { TakerAssignmentModal } from "./TakerAssignmentModal";

type Taker = { id: string; name: string };

type Props = {
  bookingId: string;
  bookingLabel: string;
  assignments: TakerAssignment[];
  takers: Taker[];
};

const SLOT_COUNT = 3;

export function TakersCell({ bookingId, bookingLabel, assignments, takers }: Props) {
  const [open, setOpen] = useState(false);
  const createAssignment = useCreateTakerAssignment();
  const updateAssignment = useUpdateTakerAssignment();
  const deleteAssignment = useDeleteTakerAssignment();

  // Map first 3 assignments to slots
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => assignments[i] ?? null);

  const handleSlotChange = useCallback(
    (slotIndex: number, takerId: string) => {
      const existing = assignments[slotIndex];
      if (!takerId) {
        // Clear: delete the assignment if it exists
        if (existing) {
          deleteAssignment.mutate(existing.id);
        }
        return;
      }
      if (existing) {
        // Update existing assignment's taker
        updateAssignment.mutate({ id: existing.id, taker_id: takerId });
      } else {
        // Create new assignment
        createAssignment.mutate({
          booking_id: bookingId,
          taker_id: takerId,
          sort_order: slotIndex,
          test_status: "not_tested",
        });
      }
    },
    [assignments, bookingId, createAssignment, updateAssignment, deleteAssignment]
  );

  return (
    <>
      <div className="flex items-center gap-1 px-1 w-full h-full">
        {slots.map((slot, i) => (
          <select
            key={i}
            className="flex-1 min-w-0 border border-input rounded px-1 py-0.5 text-[10px] bg-background focus:outline-none focus:ring-1 focus:ring-ring truncate"
            value={slot?.taker_id ?? ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              handleSlotChange(i, e.target.value);
            }}
          >
            <option value="">—</option>
            {takers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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

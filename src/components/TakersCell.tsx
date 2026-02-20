import React, { useState } from "react";
import { Users } from "lucide-react";
import { TakerAssignment } from "@/hooks/useTakerAssignments";
import { TakerAssignmentModal } from "./TakerAssignmentModal";

type Taker = { id: string; name: string };

type Props = {
  bookingId: string;
  bookingLabel: string;
  assignments: TakerAssignment[];
  takers: Taker[];
};

const STATUS_DOT: Record<string, string> = {
  tested: "🟢",
  scheduled: "🟡",
  not_tested: "🔴",
  failed: "⚠️",
};

export function TakersCell({ bookingId, bookingLabel, assignments, takers }: Props) {
  const [open, setOpen] = useState(false);

  const count = assignments.length;

  return (
    <>
      <td
        className="px-2 py-0.5 border-r border-border align-middle cursor-pointer hover:bg-muted/60 transition-colors"
        style={{ minWidth: 180 }}
        onClick={() => setOpen(true)}
      >
        {count === 0 ? (
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary text-xs transition-colors w-full">
            <Users className="h-3 w-3" />
            <span>+ Manage takers</span>
          </button>
        ) : (
          <div className="flex flex-col gap-0.5">
            {/* Summary line */}
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground">{count} taker{count !== 1 ? "s" : ""}</span>
              <span className="flex gap-0.5 ml-auto">
                {assignments.map((a) => (
                  <span key={a.id} title={STATUS_DOT[a.test_status] + " " + (a.taker_name ?? "")}>
                    {STATUS_DOT[a.test_status] ?? "🔴"}
                  </span>
                ))}
              </span>
            </div>
            {/* Chips */}
            <div className="flex flex-wrap gap-0.5">
              {assignments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-0.5 rounded bg-secondary text-secondary-foreground px-1 py-0.5 text-[10px] leading-tight max-w-[160px] truncate"
                  title={[a.taker_name, a.protocol, a.quality].filter(Boolean).join(" · ")}
                >
                  {a.taker_name && <span className="font-medium">{a.taker_name}</span>}
                  {a.protocol && <span className="text-muted-foreground">· {a.protocol}</span>}
                  {a.quality && <span className="text-muted-foreground">· {a.quality}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </td>

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

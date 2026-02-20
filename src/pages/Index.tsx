import React, { useState } from "react";
import { Radio, Settings } from "lucide-react";
import BookingsGrid from "@/components/BookingsGrid";
import AdminPage from "./AdminPage";

type Tab = "bookings" | "admin";

export default function Index() {
  const [tab, setTab] = useState<Tab>("bookings");

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Nav */}
      <header className="flex items-center gap-0 border-b border-border bg-card px-4 py-0 shrink-0" style={{ height: 44 }}>
        <div className="flex items-center gap-2 pr-6 mr-2 border-r border-border">
          <Radio className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm tracking-tight">Broadcast Booking</span>
        </div>
        <nav className="flex items-center h-full gap-0">
          {(["bookings", "admin"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`h-full px-4 text-xs font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "bookings" ? (
                <span>Bookings</span>
              ) : (
                <span className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" />Admin</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {tab === "bookings" ? (
          <BookingsGrid />
        ) : (
          <div className="h-full overflow-auto">
            <AdminPage />
          </div>
        )}
      </main>
    </div>
  );
}

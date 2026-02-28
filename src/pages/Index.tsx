import React, { useState } from "react";
import { Radio, Settings, Tv, Zap, Trophy } from "lucide-react";
import BookingsGrid from "@/components/BookingsGrid";
import AdminPage from "./AdminPage";

type Tab = "events" | "admin";
type Category = "MCR" | "ONE-OFF" | "ATP";

const categories: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: "MCR", label: "MCR", icon: Tv },
  { key: "ONE-OFF", label: "ONE-OFF", icon: Zap },
  { key: "ATP", label: "ATP", icon: Trophy },
];

export default function Index() {
  const [tab, setTab] = useState<Tab>("events");
  const [category, setCategory] = useState<Category>("MCR");

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Nav */}
      <header className="flex items-center gap-0 border-b border-border bg-card px-4 py-0 shrink-0" style={{ height: 44 }}>
        <div className="flex items-center gap-2 pr-6 mr-2 border-r border-border">
          <Radio className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm tracking-tight">Broadcast Booking</span>
        </div>
        <nav className="flex items-center h-full gap-0">
          {([
            { key: "events" as Tab, label: "Events" },
            { key: "admin" as Tab, label: "Admin", icon: Settings },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-full px-4 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon ? (
                <span className="flex items-center gap-1.5"><t.icon className="h-3.5 w-3.5" />{t.label}</span>
              ) : (
                <span>{t.label}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex">
        {tab === "events" ? (
          <>
            {/* Category Sidebar */}
            <aside className="w-40 shrink-0 border-r border-border bg-card flex flex-col">
              <div className="px-3 py-2.5 border-b border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categories</span>
              </div>
              <nav className="flex-1 py-1">
                {categories.map((c) => {
                  const isActive = category === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary border-r-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <c.icon className="h-3.5 w-3.5" />
                      {c.label}
                    </button>
                  );
                })}
              </nav>
            </aside>
            {/* Grid */}
            <div className="flex-1 overflow-hidden">
              <BookingsGrid category={category} />
            </div>
          </>
        ) : (
          <div className="h-full overflow-auto flex-1">
            <AdminPage />
          </div>
        )}
      </main>
    </div>
  );
}

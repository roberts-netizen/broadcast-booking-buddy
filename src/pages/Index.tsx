import React, { useState, useMemo } from "react";
import { Radio, Settings, Tv, Zap, Trophy } from "lucide-react";
import BookingsGrid from "@/components/BookingsGrid";
import { AdvancedCategoryView } from "@/components/AdvancedCategoryView";
import AdminPage from "./AdminPage";
import { useCategories } from "@/hooks/useLookups";
import { Booking } from "@/hooks/useBookings";

type Tab = "events" | "admin";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  MCR: Tv,
  "ONE-OFF": Zap,
  ATP: Trophy,
};

export default function Index() {
  const [tab, setTab] = useState<Tab>("events");
  const [categoryName, setCategoryName] = useState<string>("MCR");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: categories = [] } = useCategories(true);

  const activeCategory = useMemo(
    () => categories.find((c) => c.name === categoryName),
    [categories, categoryName]
  );
  const isAdvanced = activeCategory?.type === "advanced";

  // Fallback categories if DB is empty
  const displayCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    return [
      { id: "mcr", name: "MCR", type: "standard", active: true, created_at: "" },
      { id: "oneoff", name: "ONE-OFF", type: "advanced", active: true, created_at: "" },
      { id: "atp", name: "ATP", type: "advanced", active: true, created_at: "" },
    ];
  }, [categories]);

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
              onClick={() => { setTab(t.key); setSelectedBooking(null); }}
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
                {displayCategories.map((c) => {
                  const isActive = categoryName === c.name;
                  const Icon = CATEGORY_ICONS[c.name] ?? Zap;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setCategoryName(c.name); setSelectedBooking(null); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary border-r-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {c.name}
                      {c.type === "advanced" && (
                        <span className="ml-auto text-[9px] bg-primary/15 text-primary px-1 py-0.5 rounded">ADV</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Grid or Advanced View */}
            <div className="flex-1 overflow-hidden">
              {isAdvanced ? (
                <AdvancedCategoryView category={categoryName} />
              ) : (
                <BookingsGrid category={categoryName} />
              )}
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

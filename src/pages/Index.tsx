import React, { useState, useMemo, useCallback } from "react";
import { Settings, Tv, Zap, Trophy, LayoutGrid, Star } from "lucide-react";
import BookingsGrid from "@/components/BookingsGrid";
import { AdvancedCategoryView } from "@/components/AdvancedCategoryView";
import { HogmoreView } from "@/components/HogmoreView";
import AdminPage from "./AdminPage";
import McrPage from "./McrPage";
import { useCategories } from "@/hooks/useLookups";
import twoCirclesLogo from "@/assets/two-circles-logo.png";

type Tab = "events" | "mcr" | "admin";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  MCR: Tv,
  "ONE-OFF": Zap,
  ATP: Trophy,
  Hogmore: Star,
};

export default function Index() {
  const [tab, setTab] = useState<Tab>("events");
  const [categoryName, setCategoryName] = useState<string>("MCR");
  const [highlightBookingId, setHighlightBookingId] = useState<string | null>(null);
  

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

  const handleNavigateToBooking = useCallback((bookingId: string, category: string) => {
    setCategoryName(category);
    setHighlightBookingId(bookingId);
    setTab("events");
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Nav */}
      <header className="flex items-center border-b border-border bg-card px-4 py-0 shrink-0" style={{ height: 44 }}>
        <div className="flex items-center pr-6 mr-2 border-r border-border">
          <img src={twoCirclesLogo} alt="Two Circles" className="h-6" />
        </div>
        <nav className="flex items-center h-full gap-0 ml-auto">
          {([
            { key: "events" as Tab, label: "Events" },
            { key: "mcr" as Tab, label: "MCR", icon: LayoutGrid },
            { key: "admin" as Tab, label: "Admin", icon: Settings },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); }}
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
                      onClick={() => { setCategoryName(c.name); }}
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
              {categoryName === "HOGMORE" ? (
                <HogmoreView />
              ) : isAdvanced ? (
                <AdvancedCategoryView category={categoryName} highlightBookingId={highlightBookingId} onHighlightHandled={() => setHighlightBookingId(null)} />
              ) : (
                <BookingsGrid category={categoryName} highlightBookingId={highlightBookingId} onHighlightHandled={() => setHighlightBookingId(null)} />
              )}
            </div>
          </>
        ) : tab === "mcr" ? (
          <div className="h-full overflow-auto flex-1">
            <McrPage onNavigateToBooking={handleNavigateToBooking} />
          </div>
        ) : (
          <div className="h-full overflow-auto flex-1">
            <AdminPage />
          </div>
        )}
      </main>
    </div>
  );
}

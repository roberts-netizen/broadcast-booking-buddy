import React, { useState } from "react";
import ClientAccessAdmin from "@/components/ClientAccessAdmin";
import CategoriesAdmin from "@/components/CategoriesAdmin";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "client-access">("categories");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex gap-1 border-b border-border">
        <button
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("categories")}
        >
          Categories
        </button>
        <button
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "client-access"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("client-access")}
        >
          Client Access
        </button>
      </div>

      {activeTab === "categories" && <CategoriesAdmin />}
      {activeTab === "client-access" && <ClientAccessAdmin />}
    </div>
  );
}

"use client";

import { useState } from "react";
import ItemsPrices from "./ItemsPrices";
import OrderCompare from "./OrderCompare";

const SECTIONS = [
  { id: "orders", label: "Orders & Compare" },
  { id: "items", label: "Items & Prices" },
] as const;

export default function PurchasingTab() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("orders");
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              section === s.id ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {section === "orders" ? <OrderCompare /> : <ItemsPrices />}
    </div>
  );
}

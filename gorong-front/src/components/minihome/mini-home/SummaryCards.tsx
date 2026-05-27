import React from "react";

export type SummaryCardItem = {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
};

export default function SummaryCards({ items }: { items: SummaryCardItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-2xl bg-gray-50 p-4 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold">
            <s.icon className="w-4 h-4" /> {s.label}
          </div>
          <div className="mt-2 text-2xl font-extrabold text-gray-900">{s.value}</div>
        </div>
      ))}
    </div>
  );
}


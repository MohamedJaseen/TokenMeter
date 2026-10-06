import React from "react";

export function EmptyState({ title = "No data available", description = "There are no records to display at this time." }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#35465b] bg-[#0d1520]/70 p-8 text-center sm:p-12">
            <h3 className="text-sm font-semibold text-[#e7edf6]">{title}</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-[#9aa9bb]">{description}</p>
        </div>
    );
}

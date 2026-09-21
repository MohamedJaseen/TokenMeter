import React from "react";

export function EmptyState({ title = "No data available", description = "There are no records to display at this time." }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
    );
}

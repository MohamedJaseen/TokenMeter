import React from "react";
import { cn } from "./Button";
export function Table({ headers, data, renderRow, className, label = "Data table" }) {
    return (
        <div className={cn("overflow-x-auto rounded-xl border border-[#29394c] bg-[#0e1722]", className)} role="region" aria-label={label} tabIndex={0}>
            <table className="w-full min-w-[700px] text-left text-xs text-[#b8c4d6]">
                <thead className="border-b border-[#29394c] bg-[#141f2c] text-[10px] uppercase tracking-[.08em] text-[#8796a9]">
                    <tr>{headers.map((heading, index) => <th key={index} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#202e3e]">
                    {data?.length ? data.map((item, index) => renderRow(item, index)) : (
                        <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-[#8291a4]">No records found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

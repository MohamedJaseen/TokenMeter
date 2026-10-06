import React from "react";
import { Button } from "./Button";

export function ErrorState({ message = "Failed to load data", onRetry }) {
    return (
        <div role="alert" className="flex flex-col items-center justify-center rounded-xl border border-rose-400/25 bg-rose-400/5 p-8 text-center text-rose-100 sm:p-10">
            <p className="max-w-xl text-sm leading-6">{message}</p>
            {onRetry && (
                <Button variant="danger" className="mt-4" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
}

import React from "react";
import { Button } from "./Button";

export function ErrorState({ message = "Failed to load data", onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-12 text-center text-red-700">
            <p className="font-medium">{message}</p>
            {onRetry && (
                <Button variant="danger" className="mt-4" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
}

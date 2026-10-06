import React, { useEffect, useRef } from "react";

export function Modal({ isOpen, title, children, onClose }) {
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return undefined;
        const previousFocus = document.activeElement;
        const firstFocusable = dialogRef.current?.querySelector(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        );
        (firstFocusable || dialogRef.current)?.focus();
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onCloseRef.current();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            previousFocus?.focus?.();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDialogKeyDown = (event) => {
        if (event.key !== "Tab") return;
        const focusable = dialogRef.current?.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) {
            event.preventDefault();
            dialogRef.current?.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} onKeyDown={handleDialogKeyDown} className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#35465b] bg-[#111b28] shadow-2xl focus:outline-none">
                <div className="flex items-center justify-between border-b border-[#263445] px-5 py-4 sm:px-6">
                    <h3 id="modal-title" className="text-base font-semibold text-[#e7edf6]">{title}</h3>
                    <button type="button" onClick={onClose} aria-label="Close dialog" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#9baabd] hover:bg-[#202d3c] hover:text-white">&times;</button>
                </div>
                <div className="p-5 sm:p-6">{children}</div>
            </div>
        </div>
    );
}

import React from "react";
import { Button } from "./Button";

export function Modal({ isOpen, title, children, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">&times;</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

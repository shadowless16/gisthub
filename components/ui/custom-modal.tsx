import React, { ReactNode, useEffect } from "react";
import ReactDOM from "react-dom";

interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function CustomModal({ open, onClose, children }: CustomModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Close modal overlay"
      />
      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-xs w-full p-4 flex flex-col items-center z-[10000]">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black dark:hover:text-white text-2xl"
          aria-label="Close modal"
        >
          &times;
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

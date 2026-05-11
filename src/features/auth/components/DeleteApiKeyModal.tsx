"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  keyName: string;
}

export const DeleteApiKeyModal = ({ isOpen, onClose, onConfirm, keyName }: Props) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={!isDeleting ? onClose : undefined} />
      
      {/* Modal */}
      <div className="relative w-full max-w-[400px] bg-popover text-popover-foreground border border-border rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold mb-3">Delete API Key ?</h2>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Are you sure you want to delete this <span className="font-bold text-foreground">{keyName}</span> from API Key. This action cannot be undone. Please confirm to proceed.
        </p>
        
        <div className="flex items-center justify-end gap-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-sm font-bold text-foreground hover:text-muted-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-[#00a651] hover:bg-[#008f45] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting && <Loader2 size={16} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
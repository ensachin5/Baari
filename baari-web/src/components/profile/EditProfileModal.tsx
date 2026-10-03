"use client";

import React, { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Camera, Check } from "lucide-react";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  editName: string;
  setEditName: (name: string) => void;
  editImage: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: (e?: React.FormEvent) => void;
  updating: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = React.memo(({
  visible,
  onClose,
  editName,
  setEditName,
  editImage,
  onFileChange,
  onSave,
  updating,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Modal visible={visible} onClose={onClose} title="Edit Profile">
      <form onSubmit={onSave} className="py-1">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept="image/*"
          className="hidden"
        />

        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar name={editName || "User"} image={editImage} size="lg" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-navy text-white p-1.5 rounded-full border-2 border-white shadow-xs hover:bg-deepNavy transition-colors cursor-pointer"
            >
              <Camera size={14} />
            </button>
          </div>
          <span className="text-[12px] text-mutedNavy mt-2">
            Click camera icon to change photo
          </span>
        </div>

        <Input
          label="Your Name"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Enter your full name"
        />

        <Button
          title="Save Changes"
          onClick={() => onSave()}
          loading={updating}
          icon={<Check size={18} />}
          className="w-full mt-4"
        />
      </form>
    </Modal>
  );
});

EditProfileModal.displayName = "EditProfileModal";

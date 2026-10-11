"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { ArrowLeft, Building2, Hotel } from "lucide-react";
import { HomeIcon } from "@/components/ui/HomeIcon";

type PlaceType = "flat" | "pg" | "hostel";

interface FlatResponse {
  flat: {
    id: string;
    name: string;
    type?: PlaceType;
    inviteCode: string;
    role: "admin" | "member";
    memberCount: number;
  };
}

const PLACE_TYPES: { id: PlaceType; label: string; icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> }[] = [
  { id: "flat", label: "Flat", icon: HomeIcon },
  { id: "pg", label: "PG", icon: Building2 },
  { id: "hostel", label: "Hostel", icon: Hotel },
];

export default function CreateFlatPage() {
  const router = useRouter();
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [placeType, setPlaceType] = useState<PlaceType>("flat");
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState("");

  const getPlaceholder = () => {
    switch (placeType) {
      case "pg":
        return "e.g., Sai 105 or Stanza Room 3";
      case "hostel":
        return "e.g., Ganga Hostel Room 12";
      case "flat":
      default:
        return "e.g., Flat 402 or Green Villa";
    }
  };

  const getLabel = () => {
    switch (placeType) {
      case "pg":
        return "PG / Room Name";
      case "hostel":
        return "Hostel / Room Name";
      case "flat":
      default:
        return "Flat / Home Name";
    }
  };

  const createFlatMutation = useMutation({
    mutationFn: ({ flatName, type }: { flatName: string; type: PlaceType }) =>
      api.post<FlatResponse>("/api/flats", { name: flatName, type }),
    onSuccess: (res) => {
      if (res?.flat) {
        setActiveFlat({
          id: res.flat.id,
          name: res.flat.name,
          type: res.flat.type || placeType,
          inviteCode: res.flat.inviteCode,
          role: "admin",
        });
        router.replace("/home");
      }
    },
    onError: (err: Error) => {
      setLocalError(err.message || "Failed to create place");
    },
  });

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setLocalError(`Please enter a name for your ${placeType === "flat" ? "flat" : placeType.toUpperCase()}`);
      return;
    }
    setLocalError("");
    createFlatMutation.mutate({ flatName: name.trim(), type: placeType });
  };

  const errorMessage =
    localError ||
    (createFlatMutation.isError
      ? (createFlatMutation.error as Error)?.message || "Failed to create place"
      : "");

  return (
    <div className="min-h-screen bg-white px-5 pt-12 max-w-lg mx-auto w-full flex flex-col">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-5 self-start cursor-pointer text-navy hover:opacity-75 transition-opacity"
        aria-label="Back"
      >
        <ArrowLeft size={24} className="text-navy" />
      </button>

      {/* Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-[22px] leading-[28px] font-semibold text-black">
            Create a Place
          </h1>
          <p className="text-[14px] leading-[20px] text-grayBlack mt-1">
            Choose your space type and give it a recognizable name.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate}>
          {/* Segmented Place Type Control */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-black mb-1.5">
              Place Type
            </label>
            <div className="grid grid-cols-3 gap-1 bg-offWhite p-1 rounded-[10px] border border-border">
              {PLACE_TYPES.map((item) => {
                const Icon = item.icon;
                const isSelected = placeType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlaceType(item.id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-md text-[14px] font-medium transition-all ${
                      isSelected
                        ? "bg-white text-navy font-semibold shadow-sm border border-navy"
                        : "text-grayBlack hover:text-black hover:bg-white/50 border border-transparent"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isSelected ? "text-navy" : "text-grayBlack"}
                      strokeWidth={isSelected ? 2.5 : 2}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label={getLabel()}
            placeholder={getPlaceholder()}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (localError) setLocalError("");
            }}
            error={errorMessage}
            autoFocus
          />

          {/* Submit button */}
          <div className="mt-3">
            <Button
              type="submit"
              title="Create & Generate Invite Code"
              loading={createFlatMutation.isPending}
              className="w-full"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

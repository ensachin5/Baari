"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

export interface AvatarProps {
  name?: string;
  image?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const AVATAR_COLORS = [
  { bg: "#E0F2FE", text: "#0369A1", border: "#BAE6FD" }, // Sky
  { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" }, // Amber
  { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" }, // Emerald
  { bg: "#F3E8FF", text: "#7E22CE", border: "#E9D5FF" }, // Purple
  { bg: "#FFE4E6", text: "#BE123C", border: "#FECDD3" }, // Rose
  { bg: "#CCFBF1", text: "#0F766E", border: "#99F6E4" }, // Teal
  { bg: "#E0E7FF", text: "#4338CA", border: "#C7D2FE" }, // Indigo
];

function getAvatarColor(n: string) {
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

const isValidImageUri = (uri?: string | null): boolean => {
  if (!uri || typeof uri !== "string") return false;
  const trimmed = uri.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  );
};

export const Avatar: React.FC<AvatarProps> = ({
  name = "User",
  image,
  src,
  size = "md",
  className = "",
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const rawUrl = image || src;

  useEffect(() => {
    setImgFailed(false);
  }, [rawUrl]);

  const getDimensions = () => {
    switch (size) {
      case "xs":
        return { dim: 28, fontSize: "text-[10px]" };
      case "sm":
        return { dim: 32, fontSize: "text-[12px]" };
      case "lg":
        return { dim: 56, fontSize: "text-[20px]" };
      case "xl":
        return { dim: 72, fontSize: "text-[26px]" };
      case "md":
      default:
        return { dim: 40, fontSize: "text-[15px]" };
    }
  };

  const { dim, fontSize } = getDimensions();

  const getInitials = (n: string) => {
    if (!n) return "U";
    const parts = n.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const colorScheme = getAvatarColor(name || "User");
  const validUri = isValidImageUri(rawUrl);

  if (validUri && !imgFailed) {
    return (
      <div
        style={{ width: dim, height: dim }}
        className={`relative rounded-full overflow-hidden bg-[#F1F5F9] flex-shrink-0 ${className}`}
      >
        <Image
          src={rawUrl!.trim()}
          alt={name}
          width={dim}
          height={dim}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: dim,
        height: dim,
        backgroundColor: colorScheme.bg,
        borderColor: colorScheme.border,
      }}
      className={`rounded-full border flex items-center justify-center flex-shrink-0 select-none ${className}`}
    >
      <span
        style={{ color: colorScheme.text }}
        className={`${fontSize} font-bold leading-none`}
      >
        {getInitials(name)}
      </span>
    </div>
  );
};

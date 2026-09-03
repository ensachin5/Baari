"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface AvatarProps {
  name?: string;
  image?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Mirrors baari-app/components/ui/Avatar.tsx exactly.
 */
export const Avatar: React.FC<AvatarProps> = ({
  name = "User",
  image,
  src,
  size = "md",
  className = "",
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const avatarUrl = image || src;

  const getDimensions = () => {
    switch (size) {
      case "xs":
        return { dim: 28, fontSize: "text-[10px]" };
      case "sm":
        return { dim: 32, fontSize: "text-[13px]" };
      case "lg":
        return { dim: 56, fontSize: "text-[20px]" };
      case "xl":
        return { dim: 72, fontSize: "text-[26px]" };
      case "md":
      default:
        return { dim: 40, fontSize: "text-[16px]" };
    }
  };

  const { dim, fontSize } = getDimensions();

  const getInitials = (n: string) => {
    if (!n) return "U";
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  if (avatarUrl && !imgFailed) {
    return (
      <div
        style={{ width: dim, height: dim }}
        className={`relative rounded-full overflow-hidden bg-offWhite flex-shrink-0 ${className}`}
      >
        <Image
          src={avatarUrl}
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
      style={{ width: dim, height: dim }}
      className={`rounded-full bg-paleSky border border-navy/20 flex items-center justify-center flex-shrink-0 select-none ${className}`}
    >
      <span className={`${fontSize} font-bold text-deepNavy`}>
        {getInitials(name)}
      </span>
    </div>
  );
};

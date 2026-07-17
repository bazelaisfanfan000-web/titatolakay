"use client";

import React from "react";

export default function Button3D({
  children,
  onClick,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        relative
        px-6
        py-3
        rounded-xl
        bg-blue-600
        text-white
        font-bold
        shadow-[0_5px_0_#1e3a8a]
        hover:translate-y-[2px]
        hover:shadow-[0_3px_0_#1e3a8a]
        active:translate-y-[5px]
        active:shadow-none
        transition-all
        duration-150
        ${className}
      `}
    >
      {children}
    </button>
  );
}
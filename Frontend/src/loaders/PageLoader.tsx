import React from "react";
import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  className?: string;
}

export default function PageLoader({ className = "" }: PageLoaderProps) {
  return (
    <div className={`flex h-screen w-full items-center justify-center bg-black ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-brand-200" />
    </div>
  );
}

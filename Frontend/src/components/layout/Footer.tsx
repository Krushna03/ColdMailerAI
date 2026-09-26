import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-surface-900/50 py-4 mt-6 backdrop-blur-xl">
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} ColdMailerAI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

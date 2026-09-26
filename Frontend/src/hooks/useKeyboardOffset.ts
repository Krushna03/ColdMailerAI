import { useEffect, useState } from "react";

export function useKeyboardOffset(): number {
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleViewport = () => {
      const overlap = window.innerHeight - (vv.height + vv.offsetTop);
      setKeyboardOffset(overlap > 0 ? overlap : 0);
    };

    handleViewport();
    vv.addEventListener("resize", handleViewport);
    vv.addEventListener("scroll", handleViewport);
    return () => {
      vv.removeEventListener("resize", handleViewport);
      vv.removeEventListener("scroll", handleViewport);
    };
  }, []);

  return keyboardOffset;
}

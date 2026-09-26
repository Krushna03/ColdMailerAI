import { useCallback, useEffect, useRef } from "react";

// Copy text to clipboard with optional callback
export const copyToClipboard = async (
  text: string,
  onSuccess?: () => void,
  onError?: (error: any) => void
): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    if (onSuccess) onSuccess();
    return true;
  } catch (error) {
    console.error("Copy to clipboard failed:", error);
    if (onError) onError(error);
    return false;
  }
};

// Copy to clipboard with state management hook pattern.
export const useCopyToClipboard = (
  setCopied: (val: any) => void,
  timeout = 2000
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    async (text: string, id: any = null) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(id !== null ? id : true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(null), timeout);
      }
    },
    [setCopied, timeout]
  );
};

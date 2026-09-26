// Extract a human-readable message from an API/axios error, falling back gracefully.
export const getErrorMessage = (error: any, fallback = "Something went wrong"): string => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    (error instanceof Error ? error.message : fallback)
  );
};

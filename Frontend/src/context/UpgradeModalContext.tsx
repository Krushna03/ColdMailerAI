import React, { createContext, useContext, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import UpgradeModal from "../components/payment/UpgradeModal";

interface UpgradeModalContextType {
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
  isUpgradeModalOpen: boolean;
}

const UpgradeModalContext = createContext<UpgradeModalContextType>({
  openUpgradeModal: () => {},
  closeUpgradeModal: () => {},
  isUpgradeModalOpen: false,
});

export const useUpgradeModal = () => useContext(UpgradeModalContext);

export const UpgradeModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "upgrade" || searchParams.get("upgrade") === "true") {
      setOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("action");
      newParams.delete("upgrade");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <UpgradeModalContext.Provider
      value={{
        openUpgradeModal: () => setOpen(true),
        closeUpgradeModal: () => setOpen(false),
        isUpgradeModalOpen: open,
      }}
    >
      {children}
      <UpgradeModal open={open} onOpenChange={setOpen} />
    </UpgradeModalContext.Provider>
  );
};

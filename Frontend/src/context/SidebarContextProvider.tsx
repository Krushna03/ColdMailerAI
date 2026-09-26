import React, { useMemo, useState, ReactNode } from "react";
import SidebarContext, { SidebarContextType } from "./SidebarContext";

interface SidebarContextProviderProps {
  children: ReactNode;
}

export const SidebarContextProvider: React.FC<SidebarContextProviderProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const value = useMemo<SidebarContextType>(
    () => ({ isSidebarOpen, setIsSidebarOpen }),
    [isSidebarOpen]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

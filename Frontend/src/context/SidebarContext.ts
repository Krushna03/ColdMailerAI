import { createContext, useContext, Dispatch, SetStateAction } from "react";

export interface SidebarContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebarContext = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used inside SidebarContextProvider");
  }
  return context;
};

export default SidebarContext;

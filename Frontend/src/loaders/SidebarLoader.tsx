import React from "react";
import "./SidebarLoader.css"; 

const SidebarLoader: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <span className="sidebarloader"></span>
    </div>
  );
};

export default SidebarLoader;

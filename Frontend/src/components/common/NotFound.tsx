import React from "react";
import { Button } from "../ui/button";
import { NavLink } from "react-router-dom";
import Seo from "./Seo";

const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <Seo title="Page Not Found" noIndex />
      <div className="container flex max-w-md flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-gray-400">The page you are looking for doesn't exist.</p>
        <Button asChild className="mt-4">
          <NavLink to="/">Go back home</NavLink>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

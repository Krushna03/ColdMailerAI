import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { Provider } from "react-redux";
import store from "./context/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SidebarContextProvider } from "./context/SidebarContextProvider";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { HelmetProvider } from "react-helmet-async";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(
  <HelmetProvider>
    <GoogleOAuthProvider clientId={`${import.meta.env.VITE_GOOGLE_CLIENT_ID}`}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SidebarContextProvider>
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </SidebarContextProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </Provider>
    </GoogleOAuthProvider>
  </HelmetProvider>
);

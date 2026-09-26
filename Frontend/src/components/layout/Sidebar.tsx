import React, { useEffect, useRef, useState } from "react";
import { GoSidebarCollapse } from "react-icons/go";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SidebarLoader from "../../loaders/SidebarLoader";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MdDelete } from "react-icons/md";
import { useSidebarContext } from "../../context/SidebarContext";
import { MoreVertical, X } from "lucide-react";
import { Button } from "../ui/button";
import { ensureAuthenticated, useLogout } from "../../helpers/tokenValidation";
import { getToken, getUserData, capitalizeFirstLetter } from "../../utils";
import { useEmailHistory, useDeleteEmail } from "../../hooks/useEmail";
import { useIsMutating } from "@tanstack/react-query";

export default function Sidebar() {
  const [sidebarActive, setSidebarActive] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const token = getToken();
  const userData = getUserData();
  const userID = userData?._id || null;
  const { isSidebarOpen, setIsSidebarOpen } = useSidebarContext();
  const logoutUser = useLogout();

  const isGeneratingEmail = useIsMutating({ mutationKey: ["generateEmail"] }) > 0;
  const isUpdatingEmail = useIsMutating({ mutationKey: ["updateEmail"] }) > 0;
  const isGenerating = isGeneratingEmail || isUpdatingEmail;

  const {
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    error,
  } = useEmailHistory(userID);
  const emailHistory = data?.pages.flatMap((p: any) => p.emails) ?? [];

  const { mutate: deleteEmail } = useDeleteEmail();

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const sidebarScrollRef = useRef<HTMLUListElement | null>(null);

  const handleMouseEnter = () => {
    setSidebarActive(true);
  };

  const closeSidebar = () => {
    setSidebarActive(false);
    setIsSidebarOpen(false);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (
      sidebarRef?.current && e?.relatedTarget instanceof Node &&
      !sidebarRef.current.contains(e.relatedTarget)
    ) {
      setSidebarActive(false);
    }
  };

  useEffect(() => {
    if (isError) {
      const message =
        (error as any)?.response?.data?.message ||
        "An unexpected error occurred. Please try again later.";

      toast({
        title: "Error Occurred !!",
        description: message,
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [isError, error, toast]);

  const handleEmailDelete = (emailId: string) => {
    if (isGenerating) {
      toast({
        title: "Action blocked",
        description: "Please wait for the current generation to finish.",
        variant: "destructive",
      });
      return;
    }
    if (!ensureAuthenticated(token, logoutUser)) return;

    deleteEmail(emailId, {
      onError: (err: any) => {
        const message =
          err?.response?.data?.message ||
          "An unexpected error occurred. Please try again later.";

        toast({
          title: "Error Occurred !!",
          description: message,
          variant: "destructive",
          duration: 5000,
        });
      },
    });
  };

  const handleMailNavigation = (email: any) => () => {
    if (isGenerating) {
      toast({
        title: "Action blocked",
        description: "Please wait for the current generation to finish.",
        variant: "destructive",
      });
      return;
    }
    closeSidebar();
    navigate(`/email/history/${email._id}`);
  };

  useEffect(() => {
    const scrollContainer = sidebarScrollRef.current;
    if (!scrollContainer) return;

    const handleSidebarScroll = () => {
      if (isFetchingNextPage || !hasNextPage) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      if (nearBottom) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener("scroll", handleSidebarScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", handleSidebarScroll);
    };
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return (
    <>
      {/* Sidebar Toggle Button (desktop hover strip) */}
      <div
        className="fixed left-0 w-8 h-full z-50 md:flex items-end justify-center hidden"
        onMouseOver={handleMouseEnter}
      >
        <GoSidebarCollapse className="h-5 w-5 mb-4 text-gray-400" />
      </div>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[55] md:hidden"
          onClick={closeSidebar}
        />
      )}

      <div
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-surface-800 text-white z-[60] md:z-50 transform transition-transform duration-300 ${
          sidebarActive || isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 font-semibold text-lg border-b border-gray-700 flex gap-2 items-center justify-between">
          <span className="flex items-center gap-2">
            <img src="/white-logo.png" alt="logo" className="h-8 w-8 p-1 rounded" /> Your Email History
          </span>
          <button
            onClick={closeSidebar}
            aria-label="Close history"
            className="md:hidden h-8 w-8 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div> 

        <ul
          ref={sidebarScrollRef}
          className="h-[83%] overflow-y-auto sidebar-scroll p-4 px-2 space-y-4"
        >
          {emailHistory?.length > 0 ? (
            emailHistory.map((email: any, index: number) => (
              <li
                key={email._id}
                className={`group sidebar-font cursor-pointer text-sm text-surface-foreground hover:bg-[#2f2f37bc] rounded-lg px-2 py-1 flex items-center justify-between ${isGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span
                  onClick={handleMailNavigation(email)}
                  className="text-base truncate w-[100%] p-1"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        {(index + 1) + ". " + capitalizeFirstLetter(email.prompt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} align="start">
                      <p>{email.prompt}</p>
                    </TooltipContent>
                  </Tooltip>
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isGenerating}
                      className="h-8 w-6 p-0 text-slate-400 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-24 bg-[#44434af3] text-white border-none mt-2">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => handleEmailDelete(email._id)}
                        className="flex gap-1 cursor-pointer text-red-200"
                      >
                        <MdDelete color="var(--danger)" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))
          ) : !isFetching ? (
            <div key="error-message" className="text-center py-10 px-4 rounded-lg shadow-md">
              <p className="text-xl font-semibold text-gray-300 mb-2">
                No Email History
              </p>
              <p className="text-md text-gray-400 dark:text-gray-400">
                Please create your first Cold Email to get started.
              </p>
            </div>
          ) : null}

          {isFetching && <SidebarLoader />}
        </ul>

        <div className="p-3 border-t border-white/10 space-y-3">
          <Button
            variant="outline"
            className="w-full rounded-xl border-white/20 bg-brand-700 text-white hover:bg-brand-400"
            onClick={() => { closeSidebar(); navigate("/dashboard/leads"); }}
          >
            Leads
          </Button>
        </div>
      </div>
    </>
  );
}

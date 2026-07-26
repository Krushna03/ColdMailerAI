import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { ShimmerButton } from "./ui/spinner-button"
import { Menu, User } from "lucide-react"
import { useSelector } from "react-redux"
import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger} from "../components/ui/dropdown-menu"
import { PlanUsageNotice } from "./PlanUsageNotice"
import { fetchToken, useLogout } from "../helpers/tokenValidation"
import { useSidebarContext } from "../context/SidebarContext"
import { usePlanUsage } from "../hooks/usePlanUsage"

export function Header() {

  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { planUsage, usageLoading } = usePlanUsage()
  const user = useSelector(state => state.auth.userData)
  const token = fetchToken()
  const location = useLocation()
  const textToShow = location.pathname === "/payment" ? "Generate Email" : "Manage Plan"
  const logoutUser = useLogout()
  const { setIsSidebarOpen } = useSidebarContext()

  const hasSidebar =
    location.pathname.startsWith("/generate-email") ||
    location.pathname.startsWith("/email/")

  const handleLogout = async (e) => {
    e.preventDefault()
    setLoading(true)
    await logoutUser({
      title: "Logout Done !!",
      message: "You logout successfully.!!",
      variant: "default",
      redirectTo: "/",
    })
    setLoading(false)
  }
  
  return (
    <header className="sticky top-0 z-50 backdrop-blur-3xl shadow-lg group-hover:shadow-blue-900/50">
      <div className="flex h-16 items-center px-2 md:px-10">
        <NavLink to="/" className="flex items-center gap-1 md:mr-6 group">
          <div className="p-2 md:px-4 rounded-xl transition-shadow flex items-center gap-2">
            <img src="/white-logo.png" alt="logo" className="h-9 w-9 md:h-11 md:w-11 p-1 rounded" />
            <span className="font-medium text-gray-100 text-[22px] md:text-2xl">
              𝐂𝐨𝐥𝐝𝐌𝐚𝐢𝐥𝐞𝐫𝐀𝐈
            </span>
          </div>
        </NavLink>
        <div className="ml-auto flex items-center gap-1 sm:gap-4 mt-1">
          {
            token ? (
              <>
              <NavLink to={location.pathname === "/payment" ? "/generate-email" : "/payment"}>
                <ShimmerButton background="var(--brand)" className="hidden sm:block shadow-2xl hover:scale-[1.01]">
                  <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none text-white text-sm tracking-wider">
                    {
                      textToShow
                    }
                  </span>
                </ShimmerButton>
              </NavLink>

              <DropdownMenu className="ml-3">
                <DropdownMenuTrigger asChild>
                  <User className="h-8 w-8 sm:h-9 sm:w-9 mr-2 sm:mr-0 rounded-full bg-[#4a465bd3] text-white p-2 cursor-pointer"/>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[298px] bg-[#24232b] text-white border-none mr-5 mt-2">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      Name
                      <DropdownMenuShortcut>{user?.username}</DropdownMenuShortcut>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="gap-2">
                      Email
                      <DropdownMenuShortcut>
                        {user?.email}
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2">
                    <PlanUsageNotice
                      usage={planUsage}
                      loading={usageLoading}
                      onUpgrade={() => navigate('/payment')}
                      className="w-full"
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-white hover:text-black hover:rounded-md">
                    {loading ? "Logging out...." : "Logout"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {hasSidebar && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Open email history"
                  className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-gray-200 hover:bg-white/10 active:scale-95 transition"
                >
                  <Menu className="h-6 w-6" />
                </button>
              )}
              </>
            ) : null
          }
        </div>
      </div>
    </header>
  )
}


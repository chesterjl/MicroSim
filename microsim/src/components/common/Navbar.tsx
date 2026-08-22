import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {FolderKanban,Users,LogIn,UserPlus,LogOut,Menu,X} from "lucide-react";
import { assets } from "../../assets/asset";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const isActive = (path: string) => location.pathname === path;

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsMobileMenuOpen(false);
    navigate("/");
  };

  const desktopLinkClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
      active
        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80"
    }`;
    
  const mobileLinkClass = (active: boolean) =>
    `flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
      active
        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
        : "text-zinc-300 hover:text-white hover:bg-zinc-800/70"
    }`;

  return (
    <header className="relative z-50 w-full bg-[#0b0c10]/90 backdrop-blur-xl border-b border-zinc-800/60 sticky top-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-[68px] flex items-center justify-between gap-4">

          <Link to="/" className="flex items-center gap-3 shrink-0 group" onClick={closeMobileMenu}>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <div className="h-full w-full bg-zinc-950 rounded-[7px] flex items-center justify-center overflow-hidden p-1">
                <img
                  src={assets.chromeLogo}
                  alt="MicroSim Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <span className="font-bold tracking-tight text-lg text-white group-hover:text-cyan-400 transition-colors">
              MicroSim
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            <Link to="/community" className={desktopLinkClass(isActive("/community"))}>
              <Users className="w-4 h-4" />
              <span>Community Projects</span>
            </Link>

            {isLoggedIn && (
              <Link to="/my-projects" className={desktopLinkClass(isActive("/my-projects"))}>
                <FolderKanban className="w-4 h-4" />
                <span>My Projects</span>
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {!isLoggedIn ? (
              <>
                <Link to="/login"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-transparent hover:border-zinc-800 transition-all">
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>

                <Link to="/register"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-lg shadow-cyan-500/20">
                  <UserPlus className="w-4 h-4" />
                  Register
                </Link>
              </>
            ) : (
              <button type="button" onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>

          <div ref={mobileMenuRef} className="relative md:hidden">
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`flex items-center justify-center h-10 w-10 rounded-xl border transition-all ${
                isMobileMenuOpen
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                  : "bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            {isMobileMenuOpen && (
              <div className="absolute right-0 top-[52px] w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[#111216] border border-zinc-800 shadow-2xl shadow-black/40 overflow-hidden">
                <div className="p-2">
                  <Link to="/community" onClick={closeMobileMenu} className={mobileLinkClass(isActive("/community"))}>
                    <div className="flex-1">
                      <span className="block">Community Projects</span>
                    </div>
                  </Link>

                  {isLoggedIn && (
                    <Link to="/my-projects"
                      onClick={closeMobileMenu}
                      className={mobileLinkClass(isActive("/my-projects"))}
                    >
                      <div className="flex-1">
                        <span className="block">My Projects</span>
                      </div>
                    </Link>
                  )}
                </div>

                <div className="mx-3 border-t border-zinc-800/80" />
                <div className="p-3">
                  {!isLoggedIn ? (
                    <div className="flex flex-col gap-2">
                      {/* Login */}
                      <Link to="/login" onClick={closeMobileMenu}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all">
                        <LogIn className="w-4 h-4" />
                        Login
                      </Link>

                      <Link to="/register" onClick={closeMobileMenu}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all">
                        <UserPlus className="w-4 h-4" />
                        Register
                      </Link>
                    </div>
                  ) : (
                    <button type="button" onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-400 text-xs font-semibold transition-all">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
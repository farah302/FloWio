import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBell,
  FaSearch,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaTimes,
  FaBolt,
  FaVideo,
  FaFileAlt,
  FaCalendarAlt,
  FaRobot,
} from "react-icons/fa";

import NotificationsOverlay from "../NotificationsOverlay/NotificationsOverlay";

export default function Topbar({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = true,
  onMenuClick,
}) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  const [user, setUser] = useState({
    name: localStorage.getItem("userName") || "Flowio User",
    avatar: localStorage.getItem("userAvatar") || "",
    role: localStorage.getItem("userRole") || "Member",
  });

  const hasSearchHandler = typeof onSearchChange === "function";

  useEffect(() => {
    const updateUser = () => {
      setUser({
        name: localStorage.getItem("userName") || "Flowio User",
        avatar: localStorage.getItem("userAvatar") || "",
        role: localStorage.getItem("userRole") || "Member",
      });
    };

    updateUser();

    window.addEventListener("flowioUserUpdated", updateUser);
    window.addEventListener("storage", updateUser);

    return () => {
      window.removeEventListener("flowioUserUpdated", updateUser);
      window.removeEventListener("storage", updateUser);
    };
  }, []);

  const userName = user.name || "Flowio User";
  const userRole = user.role || "Member";
  const userAvatar = user.avatar || "";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("companyId");
    setLogoutModal(false);
    navigate("/login");
  };

  return (
    <>
      <div
        className={`mb-5 flex gap-3 sm:flex-row sm:items-center sm:justify-between ${
          showSearch ? "flex-col" : "flex-row items-center justify-between"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="flowio-topbar-control flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-blue-300/10 bg-[#141d66]/90 text-white transition hover:brightness-125 md:hidden"
            >
              <FaBars />
            </button>
          )}

          <h1 className="min-w-0 truncate text-[26px] font-extrabold leading-none text-white sm:text-[30px] lg:text-[34px]">
            {title}
          </h1>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {showSearch && (
            <div className="flowio-topbar-control flex h-10 min-w-0 flex-1 items-center gap-3 rounded-[14px] border border-blue-300/10 bg-[#141d66]/90 px-4 sm:w-[260px] sm:flex-none lg:w-[300px]">
              <FaSearch className="text-sm text-white/35" />

              <input
                value={hasSearchHandler ? searchValue : undefined}
                onChange={
                  hasSearchHandler
                    ? (event) => onSearchChange(event.target.value)
                    : undefined
                }
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setQuickOpen((prev) => !prev);
                setOpen(false);
                setUserMenuOpen(false);
              }}
              className="flowio-topbar-control flex h-10 items-center gap-2 rounded-[14px] border border-blue-300/10 bg-[#141d66]/90 px-4 text-white transition hover:brightness-125"
            >
              <FaBolt className="text-[#78aaff]" />
              <span className="hidden text-sm font-semibold sm:block">
                Quick
              </span>
            </button>

            {quickOpen && (
              <div className="absolute right-0 top-12 z-[9999] w-[220px] overflow-hidden rounded-[22px] border border-blue-300/10 bg-gradient-to-br from-[#151e66] to-[#070d35] p-2 text-white shadow-[0_25px_70px_rgba(0,0,0,.55)]">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/meetings");
                    setQuickOpen(false);
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm transition hover:bg-white/10"
                >
                  <FaVideo className="text-[#6eb5ff]" />
                  Meetings
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate("/summary");
                    setQuickOpen(false);
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm transition hover:bg-white/10"
                >
                  <FaFileAlt className="text-[#865dff]" />
                  Summaries
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate("/schedule");
                    setQuickOpen(false);
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm transition hover:bg-white/10"
                >
                  <FaCalendarAlt className="text-[#35b7ff]" />
                  Schedule
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate("/projects");
                    setQuickOpen(false);
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm transition hover:bg-white/10"
                >
                  <FaRobot className="text-[#64CFFF]" />
                  AI Assistant
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpen((prev) => !prev);
                setQuickOpen(false);
                setUserMenuOpen(false);
              }}
              className="flowio-topbar-control relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-blue-300/10 bg-[#141d66]/90 text-white transition hover:brightness-125"
            >
              <FaBell />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#5fffd0] shadow-[0_0_10px_rgba(95,255,208,.7)]" />
            </button>

            {open && <NotificationsOverlay onClose={() => setOpen(false)} />}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen((prev) => !prev);
                setOpen(false);
                setQuickOpen(false);
              }}
              className="hidden h-10 items-center gap-3 rounded-[14px] border border-blue-300/10 bg-[#141d66]/90 px-3 transition hover:brightness-125 md:flex"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/20 bg-[#16215f]">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-black uppercase text-[#7db6ff]">
                    {userName.charAt(0)}
                  </span>
                )}
              </div>

              <div className="min-w-0 text-left">
                <p className="max-w-[110px] truncate text-[12px] font-bold text-white">
                  {userName}
                </p>
                <p className="max-w-[110px] truncate text-[10px] capitalize text-white/45">
                  {userRole}
                </p>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 z-[9999] w-[220px] overflow-hidden rounded-[22px] border border-blue-300/10 bg-gradient-to-br from-[#151e66] to-[#070d35] p-2 text-white shadow-[0_25px_70px_rgba(0,0,0,.55)]">
                <div className="mb-2 flex items-center gap-3 rounded-[17px] bg-[#10184c]/80 p-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#16215f]">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-black uppercase text-[#7db6ff]">
                        {userName.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{userName}</p>
                    <p className="truncate text-[11px] capitalize text-white/45">
                      {userRole}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="flex h-10 w-full items-center gap-3 rounded-[14px] px-3 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <FaUser className="text-[#78aaff]" />
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/settings");
                  }}
                  className="flex h-10 w-full items-center gap-3 rounded-[14px] px-3 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <FaCog className="text-[#45e68b]" />
                  Settings
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setLogoutModal(true);
                  }}
                  className="flex h-10 w-full items-center gap-3 rounded-[14px] px-3 text-xs font-bold text-[#ff6b8a] transition hover:bg-red-400/10"
                >
                  <FaSignOutAlt />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {logoutModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[410px] rounded-[28px] border border-red-300/10 bg-gradient-to-br from-[#151e66] to-[#070d35] p-6 text-white shadow-[0_25px_80px_rgba(0,0,0,.65)]">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/15 text-red-300">
                <FaSignOutAlt />
              </div>

              <button
                type="button"
                onClick={() => setLogoutModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/60 transition hover:bg-white/15 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <h3 className="text-xl font-extrabold">Logout?</h3>

            <p className="mt-2 text-sm leading-6 text-white/50">
              Are you sure you want to logout from Flowio?
            </p>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutModal(false)}
                className="h-11 flex-1 rounded-[16px] bg-white/10 text-sm font-bold text-white/70 transition hover:bg-white/15"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={logout}
                className="h-11 flex-1 rounded-[16px] bg-gradient-to-r from-[#ff5d73] to-[#ff7aa8] text-sm font-bold text-white shadow-[0_0_22px_rgba(255,93,115,.35)] transition hover:brightness-110"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
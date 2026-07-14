// src/components/layout/Navbar.jsx
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, AlertTriangle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import NotificationBell from "../notifications/NotificationBell";
import { useState, useEffect, useRef } from 'react';

const LogoutConfirmModal = ({ onConfirm, onCancel }) => (
  <>
    {/* Backdrop */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[60]"
      onClick={onCancel}
    />

    {/* Modal */}
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61]
        bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl"
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-12 h-12 bg-red-500/15 rounded-full mx-auto mb-4">
        <LogOut className="w-6 h-6 text-red-400" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-bold text-white text-center mb-1">
        Log out?
      </h3>
      <p className="text-gray-400 text-sm text-center mb-6">
        You'll need to sign in again to access your account.
      </p>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </motion.div>
  </>
);

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);   // close dropdown first
    setShowLogoutConfirm(true); // show confirmation modal
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-gray-900 bg-opacity-95 backdrop-filter backdrop-blur-lg border-b border-gray-800 px-4 py-3 sticky top-0 z-50"
      >
        <div className="flex items-center justify-between">
          {/* Left — hamburger + brand */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-md">
                <img
                  src="/logo.png"
                  alt="logo"
                  style={{ width: "70%", height: "70%", objectFit: "contain" }}
                />
              </div>
              <h1 className="text-xl font-bold text-white">Vnr Keys</h1>
            </div>
          </div>

          {/* Right — notifications + user */}
          <div className="flex items-center space-x-4">
            <NotificationBell />

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium">
                  {user?.name}
                </span>
              </button>

              {/* Dropdown */}
              <div
                className={`absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700
                  transition-all duration-200 z-50
                  ${isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
              >
                <div className="p-3 border-b border-gray-700">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center space-x-2 w-full p-2 text-left text-gray-300 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <LogOut size={16} />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Logout confirmation modal — rendered outside navbar to avoid z-index clipping */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <LogoutConfirmModal
            onConfirm={handleConfirmLogout}
            onCancel={handleCancelLogout}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;

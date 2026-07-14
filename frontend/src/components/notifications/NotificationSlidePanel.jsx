import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import NotificationContent from './NotificationContent';

const getNotificationIcon = (notification) => {
  const title = notification.title?.toLowerCase() ?? '';
  const type  = notification.type ?? '';

  if (type === 'security_alert' || title.includes('alert') || title.includes('unreturned'))
    return <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />;
  if (type === 'key_reminder' || type === 'key_pending_return' || title.includes('reminder'))
    return <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0" />;
  if (type === 'key_returned' || title.includes('returned'))
    return <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />;
  if (type === 'key_taken' || title.includes('taken'))
    return <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />;
  if (type === 'key_summary')
    return <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0" />;

  return <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />;
};

const NotificationSlidePanel = ({ isOpen, onClose }) => {
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
  } = useNotificationStore();

  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Click a notification → mark read + close + navigate with highlight param
  const handleNotificationClick = (notification) => {
    if (!notification.read) markAsRead(notification._id);
    onClose();
    navigate(`/dashboard/notifications?highlight=${notification._id}`);
  };

  // "See all" / "See More" → just open the full page
  const handleSeeAll = () => {
    onClose();
    navigate('/dashboard/notifications');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />

          {/* Slide Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md bg-slate-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Notifications</h2>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSeeAll}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/10"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-900/20 border-b border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
              {loading ? (
                <div className="h-full flex items-center justify-center flex-col gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                  <p className="text-gray-400 text-sm">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="h-full flex items-center justify-center flex-col gap-2">
                  <Bell className="h-14 w-14 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-300">No notifications</h3>
                  <p className="text-gray-400 text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="p-4 space-y-2 pb-6">
                  {notifications.slice(0, 5).map((notification, index) => (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden
                        ${notification.read
                          ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
                          : 'bg-slate-800 border-slate-600 hover:bg-slate-700/80'
                        }`}
                    >
                      {/* Unread accent bar */}
                      {!notification.read && (
                        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                      )}

                      <div className="p-3.5 flex items-start gap-3">
                        {/* Icon */}
                        <div className="mt-0.5">
                          {getNotificationIcon(notification)}
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-semibold leading-tight ${
                              notification.read ? 'text-gray-300' : 'text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                            )}
                          </div>

                          {/* Smart content */}
                          <NotificationContent notification={notification} compact={true} />

                          {/* Timestamp */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            <span className="text-xs text-blue-400/60 hover:text-blue-400 transition-colors">
                              View →
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* See more */}
                  {notifications.length > 5 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-1">
                      <button
                        onClick={handleSeeAll}
                        className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-sm font-medium rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                        See all {notifications.length} notifications
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationSlidePanel;

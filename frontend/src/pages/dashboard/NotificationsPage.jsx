import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  Shield,
  Info,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import NotificationResendButton from '../../components/notifications/NotificationResendButton';
import NotificationContent from '../../components/notifications/NotificationContent';

const getNotificationIcon = (notification) => {
  const type  = notification.type  ?? '';
  const title = notification.title?.toLowerCase() ?? '';
  const isRead = notification.read;
  const base = 'h-5 w-5 flex-shrink-0';

  if (type === 'security_alert' || title.includes('alert') || title.includes('unreturned'))
    return <AlertTriangle className={`${base} text-red-400`} />;
  if (type === 'key_reminder' || type === 'key_pending_return' || title.includes('reminder'))
    return <AlertTriangle className={`${base} text-orange-400`} />;
  if (type === 'key_returned' || title.includes('returned'))
    return <CheckCircle className={`${base} ${isRead ? 'text-green-400' : 'text-green-300'}`} />;
  if (type === 'key_taken' || title.includes('taken'))
    return <Key className={`${base} ${isRead ? 'text-blue-400' : 'text-blue-300'}`} />;
  if (type === 'key_summary')
    return <AlertTriangle className={`${base} text-orange-400`} />;
  if (type === 'security_alert')
    return <Shield className={`${base} text-red-400`} />;

  return <Info className={`${base} ${isRead ? 'text-blue-400' : 'text-blue-300'}`} />;
};

const getLeftBorderColor = (notification) => {
  const type  = notification.type  ?? '';
  const title = notification.title?.toLowerCase() ?? '';

  if (type === 'security_alert') return 'border-l-red-500';
  if (type === 'key_reminder' || type === 'key_pending_return') return 'border-l-orange-500';
  if (type === 'key_returned' || title.includes('returned')) return 'border-l-green-500';
  if (type === 'key_taken' || title.includes('taken')) return 'border-l-blue-500';
  if (type === 'key_summary') return 'border-l-orange-400';
  if (notification.read) return 'border-l-gray-600';
  return 'border-l-blue-500';
};

const NotificationsPage = () => {
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAsUnread,
  } = useNotificationStore();

  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Scroll to and highlight the target notification after list loads
  useEffect(() => {
    if (!highlightId || loading || notifications.length === 0) return;

    // Small delay to ensure the DOM has rendered
    const timer = setTimeout(() => {
      if (highlightRef.current) {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightRef.current.classList.add('notification-highlight');

        // Fade out highlight after 3 s
        const fadeTimer = setTimeout(() => {
          highlightRef.current?.classList.remove('notification-highlight');
        }, 3000);

        return () => clearTimeout(fadeTimer);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [highlightId, notifications, loading]);

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <Bell className="h-6 w-6 md:h-7 md:w-7 text-blue-400 flex-shrink-0" />
              <h1 className="text-xl md:text-2xl font-bold text-white">Notifications</h1>
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {notifications.filter(n => !n.read).length} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(user?.role === 'security' || user?.role === 'admin') && (
                <NotificationResendButton />
              )}
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 hover:text-white rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <p className="text-gray-400 text-xs md:text-sm mt-1">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* ── List ───────────────────────────────────────────────────── */}
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
          <div className="divide-y divide-gray-700">
            <AnimatePresence>
              {loading ? (
                <div className="p-10 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3" />
                  <p className="text-gray-400">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No notifications</h3>
                  <p className="text-gray-400 text-sm">You're all caught up! New notifications will appear here.</p>
                </div>
              ) : (
                notifications.map((notification, index) => {
                  const isHighlighted = notification._id === highlightId;

                  return (
                    <motion.div
                      key={notification._id}
                      ref={isHighlighted ? highlightRef : null}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -80 }}
                      transition={{ delay: index * 0.02 }}
                      className={`
                        border-l-4 transition-colors cursor-pointer
                        ${getLeftBorderColor(notification)}
                        ${notification.read ? 'hover:bg-gray-700/30' : 'bg-blue-950/20 hover:bg-blue-950/30'}
                        ${isHighlighted ? 'notification-highlight' : ''}
                      `}
                      onClick={() =>
                        notification.read
                          ? markAsUnread(notification._id)
                          : markAsRead(notification._id)
                      }
                    >
                      <div className="p-4 flex items-start gap-4">
                        {/* Icon */}
                        <div className="mt-0.5">
                          {getNotificationIcon(notification)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h3 className={`text-sm font-semibold mb-1 ${
                            notification.read ? 'text-gray-300' : 'text-white'
                          }`}>
                            {notification.title || 'Notification'}
                          </h3>

                          {/* Smart formatted body */}
                          <NotificationContent notification={notification} compact={false} />

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {notification.createdAt
                                  ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                                  : 'Unknown time'}
                              </span>
                              <span className="capitalize bg-gray-700 px-2 py-0.5 rounded-full text-gray-400">
                                {notification.type?.replace(/_/g, ' ') || 'general'}
                              </span>
                              {notification.read && notification.readAt && (
                                <span className="text-gray-600">
                                  Read {formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}
                                </span>
                              )}
                            </div>

                            {/* Read / Unread toggle */}
                            <button
                              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                              title={notification.read ? 'Mark as unread' : 'Mark as read'}
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.read
                                  ? markAsUnread(notification._id)
                                  : markAsRead(notification._id);
                              }}
                            >
                              {notification.read
                                ? <EyeOff className="h-4 w-4" />
                                : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotificationsPage;

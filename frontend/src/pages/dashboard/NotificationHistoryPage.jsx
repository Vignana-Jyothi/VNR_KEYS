import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ArrowLeft,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  Key,
  Shield,
  Info,
  ChevronDown,
  Archive,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import NotificationContent from '../../components/notifications/NotificationContent';

const getNotificationIcon = (notification) => {
  const type = notification.type ?? '';
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
  const type = notification.type ?? '';
  const title = notification.title?.toLowerCase() ?? '';

  if (type === 'security_alert') return 'border-l-red-500';
  if (type === 'key_reminder' || type === 'key_pending_return') return 'border-l-orange-500';
  if (type === 'key_returned' || title.includes('returned')) return 'border-l-green-500';
  if (type === 'key_taken' || title.includes('taken')) return 'border-l-blue-500';
  if (type === 'key_summary') return 'border-l-orange-400';
  if (notification.read) return 'border-l-gray-600';
  return 'border-l-blue-500';
};

const NotificationHistoryPage = () => {
  const navigate = useNavigate();
  const { deleteNotification, fetchNotificationHistory, unarchiveNotification } = useNotificationStore();
  const { user } = useAuthStore();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchNotificationHistory(filterType === 'all' ? null : filterType);
        setHistory(data);
      } catch (err) {
        setError(err.message || 'Failed to load notification history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [filterType, fetchNotificationHistory]);

  // Filter and search
  const filteredHistory = history.filter(notif => {
    const matchesSearch = notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          notif.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Handle delete confirmation
  const handleDeleteClick = (notificationId) => {
    setDeleteConfirm(notificationId);
  };

  // Confirm delete
  const confirmDelete = async (notificationId) => {
    try {
      setDeletingId(notificationId);
      await deleteNotification(notificationId);
      setHistory(prev => prev.filter(n => n._id !== notificationId));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle unarchive
  const handleUnarchive = async (notificationId) => {
    try {
      await unarchiveNotification(notificationId);
      setHistory(prev => prev.filter(n => n._id !== notificationId));
    } catch (err) {
      setError('Failed to unarchive notification');
    }
  };

  return (
    <div className="p-4 md:p-6 pb-20">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/dashboard/notifications')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Back to Inbox"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Archive className="h-6 w-6 md:h-7 md:w-7 text-orange-400 flex-shrink-0" />
              <h1 className="text-xl md:text-2xl font-bold text-white">Notification History</h1>
            </div>
          </div>
          <p className="text-gray-400 text-xs md:text-sm ml-11">
            {filteredHistory.length} notification{filteredHistory.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Search & Filter ─────────────────────────────────────────── */}
        <div className="mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          {/* Filter button */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors text-sm font-medium"
            >
              Clear
            </button>
          </div>

          {/* Filter options */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-700 border border-gray-600 rounded-lg p-4 space-y-3"
            >
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Type</label>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Types' },
                    { value: 'key_taken', label: 'Keys Issued' },
                    { value: 'key_returned', label: 'Keys Returned' },
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="filter"
                        value={option.value}
                        checked={filterType === option.value}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
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
                  <p className="text-gray-400">Loading notification history...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-10 text-center">
                  <Archive className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">
                    {searchQuery || filterType !== 'all' ? 'No results' : 'No notification history'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {searchQuery ? 'Try adjusting your search' : 'Archived and read notifications will appear here'}
                  </p>
                </div>
              ) : (
                filteredHistory.map((notification, index) => (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -80 }}
                    transition={{ delay: index * 0.02 }}
                    className={`
                      border-l-4 transition-colors
                      ${getLeftBorderColor(notification)}
                      hover:bg-gray-700/30
                    `}
                  >
                    <div className="p-4 flex items-start gap-4">
                      {/* Icon */}
                      <div className="mt-0.5">
                        {getNotificationIcon(notification)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className="text-sm font-semibold mb-1 text-gray-300">
                          {notification.title || 'Notification'}
                        </h3>

                        {/* Body */}
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
                            {notification.read && (
                              <span className="text-gray-600">Read</span>
                            )}
                            {notification.archived && (
                              <span className="text-orange-600">Archived</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {notification.archived && (
                              <button
                                onClick={() => handleUnarchive(notification._id)}
                                className="p-1.5 text-gray-500 hover:text-orange-400 transition-colors rounded-lg hover:bg-gray-700/50"
                                title="Unarchive"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteClick(notification._id)}
                              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-700/50"
                              title="Delete permanently"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delete Confirmation */}
                    {deleteConfirm === notification._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-600 bg-gray-700/50 px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white mb-1">Delete this notification permanently?</p>
                            <p className="text-xs text-gray-400">This action cannot be undone.</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => confirmDelete(notification._id)}
                              disabled={deletingId === notification._id}
                              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1"
                            >
                              {deletingId === notification._id ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotificationHistoryPage;

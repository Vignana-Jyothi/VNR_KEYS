import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import axios from 'axios';
import { config } from '../../utils/config';
import { useNotificationStore } from '../../store/notificationStore';
import toast from 'react-hot-toast';

const NotificationResendButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { fetchNotifications } = useNotificationStore();

  const handleResend = async () => {
    try {
      setIsLoading(true);

      const response = await axios.post(
        `${config.api.baseUrl}/notifications/resend-daily-summary`,
        {},
        { withCredentials: true }
      );

      const message = response.data?.message || 'Daily summary sent successfully';
      toast.success(message);

      // Refresh the notification list so the new entry appears
      await fetchNotifications();

    } catch (error) {
      const serverMessage = error.response?.data?.message;

      if (error.response?.status === 400) {
        toast.error(serverMessage || 'Daily summary can only be sent after 5:20 PM');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to resend the daily summary');
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error(serverMessage || 'Failed to send daily summary. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleResend}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
        bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white"
      title="Resend daily summary notification to yourself"
    >
      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Sending...' : 'Resend Daily Summary'}
    </button>
  );
};

export default NotificationResendButton;

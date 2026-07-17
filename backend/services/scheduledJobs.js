import cron from 'node-cron';
import { checkAndSendKeyReminders, cleanupExpiredNotifications, createDailySummaryNotifications } from './notificationService.js';

/**
 * Scheduled Jobs Service
 * Handles all scheduled tasks for the application
 */

/**
 * Initialize all scheduled jobs
 */
export const initializeScheduledJobs = () => {
  console.log('🕐 Initializing scheduled jobs...');

  // Job 1: Daily key reminders at 4:55 PM (16:55)
  // Cron expression: '55 16 * * *' means "at 16:55 (4:55 PM) every day"
  const keyReminderJob = cron.schedule('55 16 * * *', async () => {
    console.log('🔔 Running daily key reminder job at 4:55 PM...');
    try {
      const result = await checkAndSendKeyReminders();
      console.log(`✅ Key reminder job completed:`, result);
    } catch (error) {
      console.error('❌ Error in key reminder job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Indian Standard Time
  });

  // Job 2: Daily summary notifications at 11:35 AM (11:35)
  // Cron expression: '35 11 * * *' means "at 11:35 (11:35 AM) every day"
  const summaryNotificationJob = cron.schedule('35 11 * * *', async () => {
    console.log('📊 Running daily summary notification job at 11:35 AM...');
    try {
      const result = await createDailySummaryNotifications(null, false);
      console.log(`✅ Summary notification job completed:`, result);
    } catch (error) {
      console.error('❌ Error in summary notification job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  
  // Job 2: Daily cleanup of expired notifications at midnight
  // Cron expression: '0 0 * * *' means "at 00:00 (midnight) every day"
  const cleanupJob = cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running daily notification cleanup job at midnight...');
    try {
      const result = await cleanupExpiredNotifications();
      console.log(`✅ Cleanup job completed: ${result.deletedCount} notifications cleaned up`);
    } catch (error) {
      console.error('❌ Error in cleanup job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // Job 3: Test job that runs every minute (for testing purposes)
  // This can be disabled in production
  const testJob = cron.schedule('*/1 * * * *', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Test job running every minute - Current time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    }
  }, {
    scheduled: process.env.NODE_ENV === 'development', // Only run in development
    timezone: "Asia/Kolkata"
  });

  // Job 4: Weekly summary job (runs every Sunday at 9:00 AM)
  // This could be used for weekly reports in the future
  const weeklyJob = cron.schedule('0 9 * * 0', () => {
    console.log('📊 Weekly summary job would run here...');
    // Future implementation: Generate weekly key usage reports
  }, {
    scheduled: false, // Disabled for now
    timezone: "Asia/Kolkata"
  });

  console.log('✅ Scheduled jobs initialized:');
  console.log('   📅 Daily key reminders: 4:55 PM IST');
  console.log('   📊 Daily summary notifications: 11:35 AM IST');
  console.log('   🧹 Daily cleanup: 12:00 AM IST');
  if (process.env.NODE_ENV === 'development') {
    console.log('   🧪 Test job: Every minute (dev only)');
  }

  return {
    keyReminderJob,
    summaryNotificationJob,
    cleanupJob,
    testJob,
    weeklyJob
  };
};

/**
 * Stop all scheduled jobs
 */
export const stopScheduledJobs = () => {
  console.log('🛑 Stopping all scheduled jobs...');
  cron.getTasks().forEach((task) => {
    task.stop();
  });
  console.log('✅ All scheduled jobs stopped');
};

/**
 * Get status of all scheduled jobs
 */
export const getJobsStatus = () => {
  const tasks = cron.getTasks();
  const status = [];
  
  tasks.forEach((task, index) => {
    status.push({
      id: index,
      running: task.running,
      scheduled: task.scheduled
    });
  });
  
  return status;
};

/**
 * Manually trigger key reminder job (for testing)
 */
export const triggerKeyReminderJob = async () => {
  console.log('🔔 Manually triggering key reminder job...');
  try {
    const result = await checkAndSendKeyReminders();
    console.log('✅ Manual key reminder job completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in manual key reminder job:', error);
    throw error;
  }
};

/**
 * Manually trigger cleanup job (for testing)
 */
export const triggerCleanupJob = async () => {
  console.log('🧹 Manually triggering cleanup job...');
  try {
    const result = await cleanupExpiredNotifications();
    console.log('✅ Manual cleanup job completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in manual cleanup job:', error);
    throw error;
  }
};

/**
 * Manually trigger daily summary job (for testing)
 */
export const triggerDailySummaryJob = async () => {
  console.log('📊 Manually triggering daily summary job...');
  try {
    const result = await createDailySummaryNotifications(null, false);
    console.log('✅ Manual daily summary job completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in manual daily summary job:', error);
    throw error;
  }
};

/**
 * Create a test job that runs immediately (for testing)
 */
export const createTestJob = (delayMinutes = 1) => {
  console.log(`🧪 Creating test job to run in ${delayMinutes} minute(s)...`);
  
  const testTime = new Date();
  testTime.setMinutes(testTime.getMinutes() + delayMinutes);
  
  const cronExpression = `${testTime.getMinutes()} ${testTime.getHours()} ${testTime.getDate()} ${testTime.getMonth() + 1} *`;
  
  const testJob = cron.schedule(cronExpression, async () => {
    console.log('🧪 Test job executing...');
    try {
      const result = await checkAndSendKeyReminders();
      console.log('✅ Test job completed:', result);
    } catch (error) {
      console.error('❌ Error in test job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  
  console.log(`✅ Test job scheduled for: ${testTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  return testJob;
};

// Export cron for direct access if needed
export { cron };

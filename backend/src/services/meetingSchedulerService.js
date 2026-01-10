const cron = require('node-cron');
const ScheduledMeeting = require('../models/ScheduledMeeting');
const Meeting = require('../models/Meeting');
const { runBot } = require('../bot/bot');

// Store active scheduled jobs
const activeJobs = new Map();

// Check for meetings to join every minute
let schedulerJob = null;

/**
 * Start the meeting scheduler service
 */
function startScheduler() {
    if (schedulerJob) {
        console.log('[Scheduler] Already running');
        return;
    }

    console.log('[Scheduler] 🚀 Starting automatic meeting scheduler...');
    
    // Run every minute to check for scheduled meetings
    schedulerJob = cron.schedule('* * * * *', async () => {
        try {
            await checkAndJoinScheduledMeetings();
        } catch (error) {
            console.error('[Scheduler] Error in cron job:', error);
        }
    });

    console.log('[Scheduler] ✅ Scheduler started - checking every minute');
}

/**
 * Stop the meeting scheduler service
 */
function stopScheduler() {
    if (schedulerJob) {
        schedulerJob.stop();
        schedulerJob = null;
        console.log('[Scheduler] ⏹️ Scheduler stopped');
    }
}

/**
 * Clean up expired scheduled meetings (older than 30 minutes)
 */
async function cleanupExpiredMeetings() {
    try {
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000); // 30 minutes ago

        // Find expired scheduled meetings
        const expiredMeetings = await ScheduledMeeting.find({
            status: 'scheduled',
            scheduledTime: { $lt: thirtyMinutesAgo }
        });

        if (expiredMeetings.length > 0) {
            console.log(`[Scheduler] 🗑️ Cleaning up ${expiredMeetings.length} expired meeting(s)`);
            
            // Delete expired meetings
            const result = await ScheduledMeeting.deleteMany({
                status: 'scheduled',
                scheduledTime: { $lt: thirtyMinutesAgo }
            });
            
            console.log(`[Scheduler] ✅ Deleted ${result.deletedCount} expired meeting(s)`);
            return result.deletedCount;
        }
        
        return 0;
    } catch (error) {
        console.error('[Scheduler] Error cleaning up expired meetings:', error);
        return 0;
    }
}

/**
 * Check for scheduled meetings that need to be joined
 */
async function checkAndJoinScheduledMeetings() {
    try {
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000); // 5 minutes buffer

        // Clean up expired meetings first
        await cleanupExpiredMeetings();

        // Find scheduled meetings that should start now (within 5 minute window)
        const upcomingMeetings = await ScheduledMeeting.find({
            status: 'scheduled',
            scheduledTime: {
                $gte: now,
                $lte: fiveMinutesFromNow
            }
        });

        if (upcomingMeetings.length > 0) {
            console.log(`[Scheduler] 📅 Found ${upcomingMeetings.length} meeting(s) to join`);
        }

        for (const scheduledMeeting of upcomingMeetings) {
            await joinScheduledMeeting(scheduledMeeting);
        }

    } catch (error) {
        console.error('[Scheduler] Error checking scheduled meetings:', error);
    }
}

/**
 * Join a scheduled meeting automatically
 */
async function joinScheduledMeeting(scheduledMeeting) {
    try {
        const meetingId = scheduledMeeting._id.toString();
        
        // Check if already joined
        if (activeJobs.has(meetingId)) {
            console.log(`[Scheduler] Meeting ${meetingId} already being processed`);
            return;
        }

        // Mark as being processed
        activeJobs.set(meetingId, true);

        console.log(`[Scheduler] 🤖 Auto-joining meeting: ${scheduledMeeting.title || 'Scheduled Meeting'}`);
        console.log(`[Scheduler] Type: ${scheduledMeeting.meetingType}, Time: ${scheduledMeeting.scheduledTime}`);

        // Create a Meeting record for this scheduled meeting
        const meeting = new Meeting({
            meetingLink: scheduledMeeting.meetingLink,
            meetingName: scheduledMeeting.title || 'Scheduled Meeting',
            status: 'pending',
            userId: scheduledMeeting.userId,
            userEmail: scheduledMeeting.userEmail,
            botName: 'AI Bot (Scheduled)',
            createdAt: new Date()
        });

        await meeting.save();
        console.log(`[Scheduler] Created meeting record: ${meeting._id}`);

        // Update scheduled meeting status to 'completed' (being processed)
        scheduledMeeting.status = 'completed';
        await scheduledMeeting.save();

        // Launch the bot to join the meeting
        const botName = `AI Bot - ${scheduledMeeting.title || 'Scheduled'}`;
        
        // Run bot in background (don't wait for it to complete)
        runBot(
            scheduledMeeting.meetingLink,
            meeting._id,
            scheduledMeeting.userId,
            botName
        ).then(() => {
            console.log(`[Scheduler] ✅ Bot successfully joined scheduled meeting: ${meeting._id}`);
            activeJobs.delete(meetingId);
        }).catch((error) => {
            console.error(`[Scheduler] ❌ Failed to join scheduled meeting:`, error);
            activeJobs.delete(meetingId);
            
            // Update meeting status to failed
            Meeting.findByIdAndUpdate(meeting._id, { 
                status: 'failed',
                error: error.message 
            }).catch(err => console.error('[Scheduler] Error updating meeting status:', err));
        });

        console.log(`[Scheduler] 🎯 Bot launch initiated for meeting: ${meeting._id}`);

    } catch (error) {
        console.error('[Scheduler] Error joining scheduled meeting:', error);
        activeJobs.delete(scheduledMeeting._id.toString());
        
        // Update scheduled meeting status to cancelled on error
        scheduledMeeting.status = 'cancelled';
        await scheduledMeeting.save().catch(err => 
            console.error('[Scheduler] Error updating scheduled meeting status:', err)
        );
    }
}

/**
 * Manually trigger a scheduled meeting (for testing)
 */
async function triggerScheduledMeeting(scheduledMeetingId) {
    try {
        const scheduledMeeting = await ScheduledMeeting.findById(scheduledMeetingId);
        
        if (!scheduledMeeting) {
            throw new Error('Scheduled meeting not found');
        }

        if (scheduledMeeting.status !== 'scheduled') {
            throw new Error('Meeting is not in scheduled status');
        }

        console.log(`[Scheduler] 🔧 Manually triggering scheduled meeting: ${scheduledMeetingId}`);
        await joinScheduledMeeting(scheduledMeeting);
        
        return { success: true, message: 'Meeting triggered successfully' };
    } catch (error) {
        console.error('[Scheduler] Error triggering meeting:', error);
        throw error;
    }
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
    return {
        running: schedulerJob !== null,
        activeJobs: activeJobs.size,
        activeJobIds: Array.from(activeJobs.keys())
    };
}

module.exports = {
    startScheduler,
    stopScheduler,
    checkAndJoinScheduledMeetings,
    triggerScheduledMeeting,
    getSchedulerStatus,
    cleanupExpiredMeetings
};

/**
 * Task Extraction Service
 * Extracts actionable tasks from meeting transcripts
 */

/**
 * Extract tasks from transcript text
 * @param {string} transcript - The meeting transcript
 * @returns {Promise<Array>} Array of extracted tasks
 */
async function extractTasksFromTranscript(transcript) {
    if (!transcript || typeof transcript !== 'string') {
        return [];
    }

    const tasks = [];
    const lines = transcript.split('\n');

    // Simple regex patterns to detect tasks
    const taskPatterns = [
        /(?:will|should|need to|must|going to|has to)\s+(.+?)(?:\.|$)/gi,
        /(?:action item|todo|task):\s*(.+?)(?:\.|$)/gi,
        /(?:assign|assigned to)\s+(\w+)\s+(?:to|for|will)\s+(.+?)(?:\.|$)/gi
    ];

    const assigneePattern = /(?:assign|assigned to|@)(\w+)/i;
    const deadlinePattern = /(?:by|due|deadline|before)\s+([A-Za-z]+\s+\d{1,2}|tomorrow|next week|end of week|\d{1,2}\/\d{1,2})/i;

    for (const line of lines) {
        for (const pattern of taskPatterns) {
            const matches = [...line.matchAll(pattern)];
            
            for (const match of matches) {
                const taskText = match[1] || match[0];
                if (taskText && taskText.length > 10 && taskText.length < 200) {
                    const assigneeMatch = line.match(assigneePattern);
                    const deadlineMatch = line.match(deadlinePattern);

                    tasks.push({
                        task: taskText.trim(),
                        assignee: assigneeMatch ? assigneeMatch[1] : 'Unassigned',
                        deadline: deadlineMatch ? deadlineMatch[1] : null,
                        addedToJira: false,
                        addedToTrello: false
                    });
                }
            }
        }
    }

    // Remove duplicates
    const uniqueTasks = tasks.filter((task, index, self) =>
        index === self.findIndex(t => t.task === task.task)
    );

    return uniqueTasks;
}

module.exports = {
    extractTasksFromTranscript
};

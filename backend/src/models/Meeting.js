const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  meetingLink: {
    type: String,
    required: true,
  },
  meetingId: {
    type: String,
    default: '',
  },
  zoomMeetingId: {
    type: String,
    default: '',
  },
  topic: {
    type: String,
    default: 'Zoom Meeting',
  },
  status: {
    type: String,
    enum: ['pending', 'starting', 'navigating', 'joining', 'waiting', 'in-meeting', 'recording', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  audioPath: {
    type: String,
  },
  transcription: {
    type: String,
    default: '',
  },
  speakerSegments: {
    type: Array,
    default: [],
  },
  speakerStats: {
    type: Object,
    default: {},
  },
  totalSpeakers: {
    type: Number,
    default: 0,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userEmail: {
    type: String,
  },
  extractedTasks: {
    type: Array,
    default: [],
  },
  meetingName: {
    type: String,
    default: 'Meeting',
  },
  botName: {
    type: String,
    default: 'AI Bot',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('Meeting', MeetingSchema);

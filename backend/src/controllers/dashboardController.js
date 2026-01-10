const { GoogleGenAI, Type } = require("@google/genai");
const Meeting = require('../models/Meeting');

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        date: { type: Type.STRING },
        summary: { type: Type.STRING },
        totalDuration: { type: Type.STRING },
        speakerCount: { type: Type.NUMBER },
        actionItemCount: { type: Type.NUMBER },
        overallSentiment: { type: Type.STRING },
        topPriorities: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        participants: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    contribution: { type: Type.NUMBER },
                    role: { type: Type.STRING },
                    persona: { type: Type.STRING }
                }
            }
        },
        actionItems: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    task: { type: Type.STRING },
                    owner: { type: Type.STRING },
                    dueDate: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    status: { type: Type.STRING }
                }
            }
        },
        decisions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    conclusion: { type: Type.STRING },
                    rationale: { type: Type.STRING }
                }
            }
        },
        risks: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    issue: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    severity: { type: Type.STRING }
                }
            }
        },
        timeline: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    time: { type: Type.STRING },
                    event: { type: Type.STRING },
                    description: { type: Type.STRING }
                }
            }
        },
        importantDates: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    event: { type: Type.STRING },
                    description: { type: Type.STRING }
                }
            }
        },
        followUpDrafts: {
            type: Type.OBJECT,
            properties: {
                email: { type: Type.STRING },
                slack: { type: Type.STRING }
            }
        },
        sentimentTimeline: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    time: { type: Type.STRING },
                    sentiment: { type: Type.NUMBER }
                }
            }
        },
        keyTopics: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    percentage: { type: Type.NUMBER }
                }
            }
        },
        topicBreakdown: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    details: { type: Type.STRING },
                    subtopics: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        },
        progress: { type: Type.NUMBER }
    },
    required: ["title", "summary", "participants", "actionItems", "decisions", "keyTopics", "progress", "risks", "followUpDrafts", "topPriorities", "timeline", "importantDates", "topicBreakdown"]
};

/**
 * Robust JSON extraction helper
 */
const extractJson = (text) => {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse AI response as JSON:", text);
        throw new Error("Invalid response format from AI");
    }
};

exports.generateDashboard = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await Meeting.findById(id);

        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (!meeting.transcription) {
            return res.status(400).json({ error: 'Meeting does not have a transcript yet.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is missing');
            return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY missing' });
        }

        console.log(`[Dashboard] Generating analysis for meeting ${id}...`);

        const prompt = `Analyze this transcript and extract comprehensive insights for a meeting dashboard.
        1. Identify Risks/Blockers (severity: High/Medium/Low).
        2. Generate a professional Follow-up Email draft.
        3. Generate a concise Slack update.
        4. Identify Top Priorities (list of strings).
        5. Create a Meeting Timeline (time, event, description).
        6. Extract Important Dates (date, event, description) for a calendar.
        7. Provide a Topic Breakdown with subtopics.
        Focus on accuracy and detail. Return raw JSON matching the schema.
        TRANSCRIPT: ${meeting.transcription}`;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: ANALYSIS_SCHEMA
            }
        });

        const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text?.() || '{}';
        const data = extractJson(rawText);

        const analysisData = {
            ...data,
            id: meeting._id,
            rawTranscript: meeting.transcription
        };

        meeting.analysis = analysisData;
        await meeting.save();

        console.log(`[Dashboard] Analysis saved for meeting ${id}`);
        res.json({ success: true, analysis: analysisData });

    } catch (err) {
        console.error('[Dashboard] Error generating analysis:', err);
        if (err.response) {
            console.error('[Dashboard] API Error details:', JSON.stringify(err.response, null, 2));
        }
        res.status(500).json({ error: 'Failed to generate dashboard analysis: ' + err.message });
    }
};

exports.getDashboard = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await Meeting.findById(id);

        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json({ success: true, analysis: meeting.analysis || null });

    } catch (err) {
        console.error('[Dashboard] Error fetching analysis:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard analysis' });
    }
};

exports.askQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { question } = req.body;

        const meeting = await Meeting.findById(id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
        if (!meeting.transcription) return res.status(400).json({ error: 'No transcript available' });

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
        }

        const prompt = `You are an AI assistant answering questions about a meeting transcript.
        TRANSCRIPT: ${meeting.transcription}
        
        QUESTION: ${question}
        
        Answer concisely and accurately based ONLY on the transcript.`;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt
        });

        const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text?.();

        res.json({ success: true, answer });

    } catch (err) {
        console.error('[Dashboard] Ask AI error:', err);
        res.status(500).json({ error: 'Failed to get answer' });
    }
};

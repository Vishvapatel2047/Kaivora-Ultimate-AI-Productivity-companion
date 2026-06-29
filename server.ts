import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to break down a task into 5 steps
  app.post("/api/ai-plan", async (req, res) => {
    try {
      const { taskName, deadline, priority, userApiKey, customPrompt } = req.body;
      
      // Determine the API key: Header -> Body -> Environment Variable
      const customKey = userApiKey || req.headers["x-gemini-api-key"];
      const apiKey = typeof customKey === "string" && customKey.trim() !== ""
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "Gemini API Key is missing. Please add your key in the Settings panel."
        });
      }

      // Initialize the GoogleGenAI client
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const prompt = customPrompt || `You are a productivity expert. The user has a task called '${taskName}' with deadline '${deadline}' and priority '${priority}'. Break this task into 5 clear actionable steps the user can start immediately. Keep each step short, practical, and motivating. Format as numbered list.`;

      // Use gemini-2.5-flash which is the robust standard text model
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ plan: response.text });
    } catch (error: any) {
      console.error("Gemini API Error in backend:", error);
      res.status(500).json({
        error: error.message || "Couldn't connect to AI. Check your API key in Settings."
      });
    }
  });

  // API Route to generate schedule
  app.post("/api/generate-schedule", async (req, res) => {
    try {
      const { tasks, currentTime, userApiKey, customPrompt } = req.body;
      
      const customKey = userApiKey || req.headers["x-gemini-api-key"];
      const apiKey = typeof customKey === "string" && customKey.trim() !== ""
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "Gemini API Key is missing. Please add your key in the Settings panel."
        });
      }

      // Initialize the GoogleGenAI client
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const tasksText = tasks.map((t: any) => `- "${t.name}" (Priority: ${t.priority}, Deadline: ${t.deadline || 'Today'})`).join('\n');

      let defaultPrompt = `Create a realistic schedule for today based on these tasks:\n${tasksText}\n\nCurrent time is ${currentTime}. Start schedule from current time. Add 10 minute breaks between tasks. Add lunch break if between 12-2pm. Format each item strictly as: TIME | TASK NAME | DURATION | PRIORITY — one per line, nothing else. End with an encouraging line starting with NOTE:`;

      const prompt = customPrompt || defaultPrompt;

      // Use gemini-3.5-flash for basic text generation tasks
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ schedule: response.text });
    } catch (error: any) {
      console.error("Gemini API Error in backend:", error);
      res.status(500).json({
        error: error.message || "Couldn't connect to AI. Check your API key in Settings."
      });
    }
  });

  // API Route for AI Assistant chat with full conversation history
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { messages, tasks, userApiKey } = req.body;

      const customKey = userApiKey || req.headers["x-gemini-api-key"];
      const apiKey = typeof customKey === "string" && customKey.trim() !== ""
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "Gemini API Key is missing. Please add your key in the Settings panel."
        });
      }

      // Initialize the GoogleGenAI client
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const tasksText = tasks.map((t: any) => `- "${t.name}" (Priority: ${t.priority}, Completed: ${t.completed ? 'Yes' : 'No'})`).join('\n');

      // Convert messages to standard Gemini contents format (user & model roles)
      const contents = messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const systemInstruction = `You are Kaivora, a warm and motivating AI productivity companion. User's current tasks:\n${tasksText}\n\nAnswer helpfully, concisely and motivatingly.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Gemini API Error in chat backend:", error);
      res.status(500).json({
        error: error.message || "Couldn't connect to AI. Check your API key in Settings."
      });
    }
  });

  // API Route for AI Reminder Intelligence Engine evaluation
  app.post("/api/ai-reminders/evaluate", async (req, res) => {
    try {
      const { tasks, currentTime, learningData, userApiKey } = req.body;

      const customKey = userApiKey || req.headers["x-gemini-api-key"];
      const apiKey = typeof customKey === "string" && customKey.trim() !== ""
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "Gemini API Key is missing. Please add your key in the Settings panel."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Prepare context for the prompt
      const tasksStr = JSON.stringify(tasks, null, 2);
      const learningStr = JSON.stringify(learningData, null, 2);

      const systemInstruction = `You are the AI Reminder Intelligence Engine for Kaivora, a highly supportive, conversational, and encouraging productivity coach.
Your absolute goal is to prevent NOTIFICATION FATIGUE while helping the user complete important tasks on time.
Evaluate the user's tasks, deadlines, progress, current time, and their historical behavioral analytics (ignored vs. completed/acted reminders, preferred hours, postponed trends).

DECISION CRITERIA:
1. MUTE/SKIP REMINDER (shouldRemind = false) if:
   - No tasks are uncompleted, or no tasks have imminent deadlines (e.g. all deadlines are over a week away or have 100% progress).
   - The user is experiencing notification fatigue (e.g., they have ignored several reminders recently, or their acted ratio is low). In this case, give a helpful, low-pressure reasoning in the 'analysis' field.
   - The current time is outside the user's preferred working hours, unless the task is critical (priority = 'Urgent' or 'High') and extremely high risk (overdue or due within hours).
   - We already sent a reminder for this task recently, and there is no new progress or risk change.
2. TRIGGER PROGRESSIVE REMINDER (shouldRemind = true) if:
   - A task is uncompleted, has work remaining, and is becoming risky.
   - Determine the correct level:
     * Level 1 – Early Awareness: Due in 4 to 7 days, progress is very low (< 20%). Gentle heads-up to start early.
     * Level 2 – Gentle Suggestion: Due in 2 to 3 days. Mention estimated duration and suggest a good time to start (e.g., "Consider starting this evening").
     * Level 3 – Risk Warning: Due in 1 to 2 days, progress < 50%. Warn that they are at risk of missing the deadline if they don't start soon.
     * Level 4 – Actionable Assistance: Due today or tomorrow, progress is low/medium. Offer immediate, practical relief (e.g. "Would you like me to split this task or reschedule lower-priority items?").

3. EXPLAIN THE REASON:
   Every reminder must include a friendly, supportive human-readable explanation of why it is showing now. Examples:
   - "I'm reminding you now because this is usually your most productive time."
   - "I'm reminding you because this task now has a high risk of missing its deadline."
   - "I'm reminding you because completing it today will reduce tomorrow's workload."

Tone: Supportive, companion-like, highly encouraging. Never use guilt, pressure, or negativity. Use emojis warmly.`;

      const prompt = `Current Local Time: ${currentTime}
User Adaptive Behavioral Matrix:
${learningStr}

Uncompleted Tasks List:
${tasksStr}

Please evaluate the tasks and decide whether to send a reminder. If yes, choose the single most appropriate task that needs attention and generate the progressive level, message, friendly reason, and analysis. If no, set shouldRemind to false and write an insightful explanation of why you are protecting their focus (notification fatigue prevention).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shouldRemind: {
                type: Type.BOOLEAN,
                description: "Whether to display a reminder right now."
              },
              taskId: {
                type: Type.STRING,
                description: "The unique ID of the task to remind. Omit or set to empty string if shouldRemind is false."
              },
              level: {
                type: Type.INTEGER,
                description: "The progressive reminder level (1, 2, 3, or 4) to issue. Omit or set to 0 if shouldRemind is false."
              },
              message: {
                type: Type.STRING,
                description: "The encouraging, warm, conversational message written specifically for this task and level. Do not repeat verbatim if we have previous reminders in history."
              },
              reason: {
                type: Type.STRING,
                description: "The companion explanation of why this reminder is appearing now (e.g., 'I'm reminding you now because...'). Omit if shouldRemind is false."
              },
              analysis: {
                type: Type.STRING,
                description: "A summary of your internal decision reasoning (e.g. 'Muted to prevent fatigue because user ignored 3 consecutive reminders today' or 'Triggered Level 3 warning because task takes 5 hours and is due in 30 hours with 0% progress')."
              }
            },
            required: ["shouldRemind", "analysis"]
          }
        }
      });

      res.setHeader("Content-Type", "application/json");
      res.send(response.text);
    } catch (error: any) {
      console.error("Gemini API Error in evaluate-reminders:", error);
      res.status(500).json({
        error: error.message || "Couldn't connect to AI. Check your API key in Settings."
      });
    }
  });

  // API Route to break a task into smaller structured steps/subtasks
  app.post("/api/ai-reminders/split-task", async (req, res) => {
    try {
      const { taskName, estimatedDuration, priority, deadline, userApiKey } = req.body;

      const customKey = userApiKey || req.headers["x-gemini-api-key"];
      const apiKey = typeof customKey === "string" && customKey.trim() !== ""
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "Gemini API Key is missing. Please add your key in the Settings panel."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const systemInstruction = `You are a productivity expert who specializes in breaking down intimidating tasks into small, bite-sized, actionable sub-tasks.
Split the provided task into 3 to 5 realistic, step-by-step subtasks.
Keep names short and practical. Distribute the total estimated duration (e.g., ${estimatedDuration || 2} hours) reasonably among the subtasks. Provide priority for each.`;

      const prompt = `Task: "${taskName}"
Priority: ${priority || "Medium"}
Total Duration: ${estimatedDuration || 2} hours
Deadline: ${deadline || "Unspecified"}

Please split this task into smaller steps and return a JSON list of subtasks.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                description: "Array of sub-task steps.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Short, crisp, actionable name for this subtask step."
                    },
                    estimatedDuration: {
                      type: Type.NUMBER,
                      description: "Allocated work duration in hours for this specific step."
                    },
                    priority: {
                      type: Type.STRING,
                      description: "Priority of this specific step: 'High', 'Medium', or 'Low'."
                    }
                  },
                  required: ["name", "estimatedDuration", "priority"]
                }
              }
            },
            required: ["subtasks"]
          }
        }
      });

      res.setHeader("Content-Type", "application/json");
      res.send(response.text);
    } catch (error: any) {
      console.error("Gemini API Error in split-task:", error);
      res.status(500).json({
        error: error.message || "Couldn't connect to AI. Check your API key in Settings."
      });
    }
  });

  // API Route to generate structured AI Coach recommendations, insights, briefings, reflections
  app.post("/api/ai-coach/generate", async (req, res) => {
    try {
      const { tasks, currentTime, mood, learningData, streak, userApiKey } = req.body;

      const customKey = userApiKey || req.headers["x-gemini-api-key"];
      const apiKey = typeof customKey === "string" && customKey.trim() !== ""
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "Gemini API Key is missing. Please add your key in the Settings panel."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const systemInstruction = `You are the AI Daily Coach for Kaivora, an extremely supportive, intelligent, and encouraging personal productivity mentor.
Your goal is to help the user plan, prioritize, stay motivated, and build healthy work habits without ever overwhelming or guilting them.
Always communicate with warmth, calm, and positive reinforcement. Celebrate small wins.

You will analyze:
1. Today's tasks (names, priority, completion status, estimated durations, deadlines).
2. The user's current mood (e.g. 'Productive', 'Tired', 'Stressed', 'Calm', 'Motivated').
3. The current local time.
4. The user's current daily streak and completion stats.
5. Historical learning/behavioral metrics.

Based on this, generate:
- A personalized greeting matching the time of day and mood.
- Today's primary mission: 2-4 key high-impact tasks.
- Supportive AI Insights and gentle warnings about imminent deadlines.
- Smart recommendations: Highest impact task, best time to tackle it, mindful suggested breaks, lower priority tasks to postpone if they are feeling Tired/Stressed, and complex tasks to split.
- Dynamic coaching message matching the morning/afternoon/evening context.
- Daily progress summary with achievement highlights and feedback.
- Weekly reflection of accomplishments, longest streak, best working hours, and constructive growth tips.
- 2-3 short valuable notifications to guide their day.

Ensure the tone is friendly, professional, calming, and validating. Never use guilt or pressure. Keep language crisp, clean, and elegant.`;

      const prompt = `Current Local Time: ${currentTime || new Date().toISOString()}
User's Current Mood: ${mood || "Calm"}
Current Daily Streak: ${streak || 0} days
Historical Analytics Data: ${JSON.stringify(learningData || {})}
Current Active and Completed Tasks:
${JSON.stringify(tasks || [])}

Please evaluate the context and generate the fully structured AI Coaching report. Return strictly valid JSON conforming to the requested schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              greeting: {
                type: Type.STRING,
                description: "A warm, supportive greeting tailored to the user and time of day, e.g., '🌞 Good Morning, Vishvaa!' or '🌙 Good Evening, Vishvaa!'."
              },
              mission: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Today's primary mission: 2-3 key high-impact tasks selected from the uncompleted list."
              },
              aiInsight: {
                type: Type.STRING,
                description: "An analytical insight explaining how completing today's mission keeps them ahead of upcoming deadlines."
              },
              motivation: {
                type: Type.STRING,
                description: "An encouraging, friendly motivational message recognizing their progress or streak."
              },
              smartRecommendations: {
                type: Type.OBJECT,
                properties: {
                  highestImpactTask: {
                    type: Type.STRING,
                    description: "The single highest-impact task they should focus on first, and why."
                  },
                  bestTimeToWork: {
                    type: Type.STRING,
                    description: "Suggested time window to tackle this highest-impact task based on their mood and preferred hours."
                  },
                  suggestedBreaks: {
                    type: Type.STRING,
                    description: "A mindful break suggestion, e.g., 'Take a 10-minute screen-free tea break after your focus session'."
                  },
                  tasksToPostpone: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Tasks they can safely postpone to tomorrow if they are feeling Tired or Stressed, or if they have too many items."
                  },
                  tasksToSplit: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Long or high-priority tasks that would benefit from being broken into smaller micro-steps."
                  }
                },
                required: ["highestImpactTask", "bestTimeToWork", "suggestedBreaks", "tasksToPostpone", "tasksToSplit"]
              },
              dynamicCoaching: {
                type: Type.STRING,
                description: "Contextual coaching advice based on current hour, e.g., 'Start your most difficult task while energy is high' (morning) or 'You are making great progress, finish one more task' (afternoon)."
              },
              progressSummary: {
                type: Type.OBJECT,
                properties: {
                  tasksCompletedCount: {
                    type: Type.INTEGER,
                    description: "Count of completed tasks today."
                  },
                  timeFocusedMinutes: {
                    type: Type.INTEGER,
                    description: "Estimated focus time in minutes (e.g. 25-50 mins per completed task, or a general estimate)."
                  },
                  productivityScore: {
                    type: Type.INTEGER,
                    description: "A calculated productivity score from 0 to 100."
                  },
                  highlights: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "1-2 highlights of achievements."
                  },
                  feedback: {
                    type: Type.STRING,
                    description: "A warm, supportive, validating paragraph celebrating their efforts."
                  },
                  suggestionsForTomorrow: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "1-2 suggestions for organizing tomorrow."
                  }
                },
                required: ["tasksCompletedCount", "timeFocusedMinutes", "productivityScore", "highlights", "feedback", "suggestionsForTomorrow"]
              },
              weeklyReflection: {
                type: Type.OBJECT,
                properties: {
                  tasksCompletedCount: {
                    type: Type.INTEGER,
                    description: "Approximate count of tasks completed this week."
                  },
                  longestStreak: {
                    type: Type.INTEGER,
                    description: "Their current or longest completion streak."
                  },
                  mostProductiveDay: {
                    type: Type.STRING,
                    description: "Estimated most productive day of the week."
                  },
                  bestWorkingHours: {
                    type: Type.STRING,
                    description: "Identified optimal productive hours window, e.g. '10 AM - 1 PM'."
                  },
                  mostDelayedCategory: {
                    type: Type.STRING,
                    description: "Category or keyword of tasks they delay most, with suggestions."
                  },
                  improvementSuggestions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "1-2 tips to optimize flow next week."
                  },
                  insights: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Personalized coaching insights to reflect upon."
                  }
                },
                required: ["tasksCompletedCount", "longestStreak", "mostProductiveDay", "bestWorkingHours", "mostDelayedCategory", "improvementSuggestions", "insights"]
              },
              notifications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2-3 short notification messages (e.g., 'You only need one more task to complete today's mission.')."
              }
            },
            required: [
              "greeting",
              "mission",
              "aiInsight",
              "motivation",
              "smartRecommendations",
              "dynamicCoaching",
              "progressSummary",
              "weeklyReflection",
              "notifications"
            ]
          }
        }
      });

      res.setHeader("Content-Type", "application/json");
      res.send(response.text);
    } catch (error: any) {
      console.error("Gemini API Error in ai-coach/generate:", error);
      res.status(500).json({
        error: error.message || "Couldn't connect to AI. Check your API key in Settings."
      });
    }
  });

  // Vite middleware for development, or static file server in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

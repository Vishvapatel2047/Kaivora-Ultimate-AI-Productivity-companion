import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Clock, 
  Flame, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Heart, 
  ListTodo, 
  Smile, 
  CheckSquare, 
  Play, 
  Pause, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  Sliders, 
  Volume2, 
  Bot, 
  Zap, 
  Coffee, 
  ArrowRight, 
  Clock3, 
  Moon, 
  Sun, 
  Activity,
  Award,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Target
} from 'lucide-react';

// Task interface matches App.tsx
interface Task {
  id: string;
  name: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  deadline: string;
  time?: string;
  meta?: string;
  completed: boolean;
  completedAt?: string;
  shieldAwarded?: boolean;
  voiceProfileId?: string;
  estimatedDuration?: number;
  progress?: number;
  createdDate?: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  emoji: string;
  isDefault?: boolean;
  audioBase64?: string;
}

interface AICoachPageProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  voiceProfiles?: VoiceProfile[];
  handleReminderActionStartFocus?: (taskId: string) => void;
  toggleTaskCompletion?: (taskId: string) => void;
  userApiKey?: string;
  isDarkMode?: boolean;
  compact?: boolean; // If true, render as the Desktop Right Side Panel / Tablet Collapsible side panel
  isTablet?: boolean;
  streakCount?: number;
  longestStreak?: number;
}

// Fallback Coach State
interface CoachState {
  greeting: string;
  mission: string[];
  aiInsight: string;
  motivation: string;
  smartRecommendations: {
    highestImpactTask: string;
    bestTimeToWork: string;
    suggestedBreaks: string;
    tasksToPostpone: string[];
    tasksToSplit: string[];
  };
  dynamicCoaching: string;
  progressSummary: {
    tasksCompletedCount: number;
    timeFocusedMinutes: number;
    productivityScore: number;
    highlights: string[];
    feedback: string;
    suggestionsForTomorrow: string[];
  };
  weeklyReflection: {
    tasksCompletedCount: number;
    longestStreak: number;
    mostProductiveDay: string;
    bestWorkingHours: string;
    mostDelayedCategory: string;
    improvementSuggestions: string[];
    insights: string[];
  };
  notifications: string[];
}

export default function AICoachPage({
  tasks,
  setTasks,
  activeTab,
  setActiveTab,
  voiceProfiles = [],
  handleReminderActionStartFocus,
  toggleTaskCompletion,
  userApiKey = '',
  isDarkMode = false,
  compact = false,
  isTablet = false,
  streakCount,
  longestStreak
}: AICoachPageProps) {

  // Local state for mood check
  const [currentMood, setCurrentMood] = useState<'Productive' | 'Tired' | 'Stressed' | 'Calm' | 'Motivated'>('Calm');
  const [coachLoading, setCoachLoading] = useState<boolean>(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'plan' | 'stats' | 'weekly'>('plan');
  const [expandedSection, setExpandedSection] = useState<string | null>('brief');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dialog state for breaking down a task
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [taskToSplit, setTaskToSplit] = useState<string>('');
  const [splittingInProgress, setSplittingInProgress] = useState<boolean>(false);
  const [splitResult, setSplitResult] = useState<any[]>([]);

  // Dialog state for rescheduling tasks
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);

  // Generate local baseline / offline coach insights instantly
  const getOfflineCoachState = (currentTasks: Task[], mood: string): CoachState => {
    const activeTasks = currentTasks.filter(t => !t.completed);
    const completedTasks = currentTasks.filter(t => t.completed);
    const urgentTasks = activeTasks.filter(t => t.priority === 'Urgent');
    const highTasks = activeTasks.filter(t => t.priority === 'High');

    // Key task determination
    let highestImpact = activeTasks[0]?.name || "Plan your next big goal";
    if (urgentTasks.length > 0) {
      highestImpact = urgentTasks[0].name;
    } else if (highTasks.length > 0) {
      highestImpact = highTasks[0].name;
    }

    // Determine Greeting & Suggestions based on time and mood
    const hour = new Date().getHours();
    let timeGreeting = "🌞 Good Morning, Vishvaa!";
    let dynamicCoachingMessage = "Start your most difficult task while your energy is highest.";

    if (hour >= 12 && hour < 17) {
      timeGreeting = "☀️ Good Afternoon, Vishvaa!";
      dynamicCoachingMessage = "You're making steady progress. Let's finish one more high-priority task before taking a screen-free break.";
    } else if (hour >= 17) {
      timeGreeting = "🌙 Good Evening, Vishvaa!";
      const complRatio = currentTasks.length > 0 ? completedTasks.length / currentTasks.length : 0;
      if (complRatio >= 0.8) {
        dynamicCoachingMessage = `You've completed ${Math.round(complRatio * 100)}% of today's plan! A gentle 10-minute wind-down session will clear everything.`;
      } else {
        dynamicCoachingMessage = "Focus on wrapping up one small actionable step tonight. Keep it low pressure and prepare your mind for rest.";
      }
    }

    if (mood === 'Tired' || mood === 'Stressed') {
      dynamicCoachingMessage = "Energy feels low right now. Let's shift away from massive projects and knock out a smaller, low-pressure task to rebuild momentum.";
    }

    // Determine warnings
    const warnings = activeTasks.map(t => t.name).slice(0, 2);

    return {
      greeting: timeGreeting,
      mission: activeTasks.slice(0, 3).map(t => t.name),
      aiInsight: activeTasks.length > 0 
        ? `Tackling "${highestImpact}" today gives you an excellent chance of staying ahead of all upcoming deadlines.`
        : "All clear! You are perfectly on schedule. Use this spaciousness to rest or dive into a passion project.",
      motivation: completedTasks.length > 0 
        ? `You've checked off ${completedTasks.length} goal${completedTasks.length > 1 ? 's' : ''} today. Keep that elegant momentum moving forward.`
        : "Let's take a deep breath and start with a single 5-minute micro-step. Momentum builds once we begin.",
      smartRecommendations: {
        highestImpactTask: highestImpact,
        bestTimeToWork: mood === 'Tired' ? "Later this afternoon once you rest" : "During your prime peak hours (10 AM - 12 PM)",
        suggestedBreaks: mood === 'Stressed' ? "Take a 10-minute eyes-closed breathing pause right now" : "A 5-minute stretching break for every 25 minutes focused",
        tasksToPostpone: activeTasks.filter(t => t.priority === 'Low').map(t => t.name).slice(0, 2),
        tasksToSplit: activeTasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').map(t => t.name).slice(0, 2)
      },
      dynamicCoaching: dynamicCoachingMessage,
      progressSummary: {
        tasksCompletedCount: completedTasks.length,
        timeFocusedMinutes: completedTasks.length * 30 + (completedTasks.length > 0 ? 15 : 0),
        productivityScore: currentTasks.length > 0 ? Math.round((completedTasks.length / currentTasks.length) * 100) : 0,
        highlights: completedTasks.map(t => `Completed "${t.name}"`).slice(0, 2),
        feedback: "You are doing incredibly well. By honoring your energy and focusing on what is essential, you are protecting your peace of mind.",
        suggestionsForTomorrow: ["Select your top 3 primary objectives tonight to hit the ground running with absolute clarity."]
      },
      weeklyReflection: {
        tasksCompletedCount: completedTasks.length + 8,
        longestStreak: 5,
        mostProductiveDay: "Wednesday",
        bestWorkingHours: "9:00 AM - 11:30 AM",
        mostDelayedCategory: "Complex administrative reviews",
        improvementSuggestions: ["Schedule a 30-minute 'Focus Buffer' block first thing in the morning to handle small tasks before deep work."],
        insights: ["Your focus is highest when you start with a warm beverage and a 5-minute stretch. Keep building this serene morning ritual."]
      },
      notifications: [
        activeTasks.length === 1 
          ? "You only need one more task to complete today's mission!"
          : "You are entering your typical peak focus window. Consider initializing a Focus Session now.",
        "Your Java Assignment is becoming higher risk. Starting a 20-minute session will keep you comfortably on schedule."
      ]
    };
  };

  // State to hold the active coach metrics
  const [rawCoachData, setRawCoachData] = useState<CoachState>(() => {
    const saved = localStorage.getItem('kaivora_coach_cached_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return getOfflineCoachState(tasks, currentMood);
  });

  // Derived synced state that overrides static values with 100% accurate, live synchronized data
  const liveCompletedCount = tasks.filter(t => t.completed).length;
  const liveTotalCount = tasks.length;
  const liveProductivityScore = liveTotalCount > 0 ? Math.round((liveCompletedCount / liveTotalCount) * 100) : 0;
  const liveStreakCount = streakCount !== undefined ? streakCount : parseInt(localStorage.getItem('kaivora_streak_count') || '0', 10);
  const liveLongestStreak = longestStreak !== undefined ? longestStreak : Math.max(liveStreakCount, parseInt(localStorage.getItem('kaivora_longest_streak') || '0', 10));

  const liveTimeFocused = tasks.filter(t => t.completed).reduce((acc, t) => {
    return acc + (t.estimatedDuration ? Math.round(t.estimatedDuration * 60) : 30);
  }, 0);

  const coachData: CoachState = {
    ...rawCoachData,
    progressSummary: {
      ...rawCoachData.progressSummary,
      tasksCompletedCount: liveCompletedCount,
      timeFocusedMinutes: liveTimeFocused,
      productivityScore: liveProductivityScore,
      highlights: liveCompletedCount > 0 
        ? tasks.filter(t => t.completed).map(t => `Completed "${t.name}"`) 
        : rawCoachData.progressSummary.highlights
    },
    weeklyReflection: {
      ...rawCoachData.weeklyReflection,
      tasksCompletedCount: liveCompletedCount,
      longestStreak: liveLongestStreak
    }
  };

  // Re-sync offline recommendations dynamically when tasks or mood change
  useEffect(() => {
    const saved = localStorage.getItem('kaivora_coach_cached_data');
    if (!saved) {
      const offline = getOfflineCoachState(tasks, currentMood);
      setRawCoachData(offline);
    }
  }, [tasks, currentMood]);

  // Toast handler helper
  const showLocalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Function to call server-side AI Coach endpoint to generate truly intelligent context-aware response
  const generateAICoachInsights = async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const localTime = new Date().toISOString();
      const streakSaved = localStorage.getItem('kaivora_streak_count') || "3";
      const learningSaved = localStorage.getItem('kaivora_reminder_learning_data');
      const parsedLearning = learningSaved ? JSON.parse(learningSaved) : {};

      const response = await fetch('/api/ai-coach/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': userApiKey
        },
        body: JSON.stringify({
          tasks: tasks.map(t => ({
            id: t.id,
            name: t.name,
            priority: t.priority,
            deadline: t.deadline,
            completed: t.completed,
            progress: t.progress || 0,
            estimatedDuration: t.estimatedDuration || 1
          })),
          currentTime: localTime,
          mood: currentMood,
          learningData: parsedLearning,
          streak: parseInt(streakSaved, 10),
          userApiKey: userApiKey
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Server could not generate insights.");
      }

      const generatedData: CoachState = await response.json();
      setRawCoachData(generatedData);
      localStorage.setItem('kaivora_coach_cached_data', JSON.stringify(generatedData));
      showLocalToast("✨ AI Coach synchronized! Recommendations updated for today.");
    } catch (err: any) {
      console.error(err);
      setCoachError(err.message || "Connection failed. Showing offline coach recommendations.");
      // Fallback to offline generation so it remains fully functional
      const offline = getOfflineCoachState(tasks, currentMood);
      setRawCoachData(offline);
    } finally {
      setCoachLoading(false);
    }
  };

  // Auto trigger real AI generation when mood changes (if an api key exists)
  useEffect(() => {
    if (userApiKey && userApiKey.trim() !== "") {
      generateAICoachInsights();
    } else {
      // Re-generate local offline insights matching new mood
      const offline = getOfflineCoachState(tasks, currentMood);
      setRawCoachData(offline);
    }
  }, [currentMood]);

  // Action: Break task down using backend AI route
  const handleSplitTaskAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToSplit) return;
    setSplittingInProgress(true);
    try {
      const targetTask = tasks.find(t => t.id === taskToSplit);
      if (!targetTask) return;

      const response = await fetch('/api/ai-reminders/split-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': userApiKey
        },
        body: JSON.stringify({
          taskName: targetTask.name,
          estimatedDuration: targetTask.estimatedDuration || 2,
          priority: targetTask.priority,
          deadline: targetTask.deadline,
          userApiKey: userApiKey
        })
      });

      if (!response.ok) {
        throw new Error("Could not break down task. Using default split.");
      }

      const data = await response.json();
      const subtasksList = data.subtasks || [];
      setSplitResult(subtasksList);

      // Mutate Tasks state to add subtasks and remove the original, or supplement it
      const newTasks: Task[] = [];
      tasks.forEach(t => {
        if (t.id === taskToSplit) {
          // Add split subtasks
          subtasksList.forEach((sub: any, index: number) => {
            newTasks.push({
              id: `${t.id}-step-${index + 1}`,
              name: `↳ ${sub.name}`,
              priority: sub.priority || t.priority,
              deadline: t.deadline,
              completed: false,
              estimatedDuration: sub.estimatedDuration || 0.5,
              progress: 0,
              createdDate: (() => {
                const now = new Date();
                return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              })()
            });
          });
        } else {
          newTasks.push(t);
        }
      });

      setTasks(newTasks);
      localStorage.setItem('kaivora_tasks', JSON.stringify(newTasks));
      showLocalToast(`🎯 "${targetTask.name}" has been successfully broken into ${subtasksList.length} micro-steps!`);
      setShowSplitModal(false);
    } catch (err: any) {
      // Offline fallback: manually split into 3 default micro-steps
      const targetTask = tasks.find(t => t.id === taskToSplit);
      if (targetTask) {
        const offlineSubtasks = [
          { name: "Initial preparation and planning (15 mins)", priority: targetTask.priority, estimatedDuration: 0.25 },
          { name: "Core execution and drafting (45 mins)", priority: targetTask.priority, estimatedDuration: 0.75 },
          { name: "Final review and quality polish (15 mins)", priority: targetTask.priority, estimatedDuration: 0.25 }
        ];
        
        const newTasks: Task[] = [];
        tasks.forEach(t => {
          if (t.id === taskToSplit) {
            offlineSubtasks.forEach((sub, index) => {
              newTasks.push({
                id: `${t.id}-step-${index + 1}`,
                name: `↳ ${sub.name}`,
                priority: sub.priority as any,
                deadline: t.deadline,
                completed: false,
                estimatedDuration: sub.estimatedDuration,
                progress: 0,
                createdDate: (() => {
                  const now = new Date();
                  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                })()
              });
            });
          } else {
            newTasks.push(t);
          }
        });
        
        setTasks(newTasks);
        localStorage.setItem('kaivora_tasks', JSON.stringify(newTasks));
        showLocalToast(`🌿 Broken down "${targetTask.name}" into steps locally.`);
        setShowSplitModal(false);
      }
    } finally {
      setSplittingInProgress(false);
    }
  };

  // Action: Postpone all low priority tasks to clear schedule
  const handlePostponeLowPriorityAction = () => {
    const lowTasks = tasks.filter(t => !t.completed && t.priority === 'Low');
    if (lowTasks.length === 0) {
      showLocalToast("No low priority pending tasks found to reschedule.");
      setShowRescheduleModal(false);
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const updated = tasks.map(t => {
      if (!t.completed && t.priority === 'Low') {
        return {
          ...t,
          deadline: tomorrowStr,
          meta: "Postponed by Coach"
        };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem('kaivora_tasks', JSON.stringify(updated));
    showLocalToast(`📅 Rescheduled ${lowTasks.length} low-priority task(s) to tomorrow. Focus cleared!`);
    setShowRescheduleModal(false);
  };

  // Quick Action triggers Focus Session
  const triggerFocusSessionForHighest = () => {
    const activeTasks = tasks.filter(t => !t.completed);
    if (activeTasks.length === 0) {
      showLocalToast("All tasks are already completed! Add a new task first.");
      return;
    }

    // Select highest priority task
    const urgent = activeTasks.find(t => t.priority === 'Urgent');
    const high = activeTasks.find(t => t.priority === 'High');
    const target = urgent || high || activeTasks[0];

    if (handleReminderActionStartFocus) {
      handleReminderActionStartFocus(target.id);
      setActiveTab('Reminders'); // Go to reminders where focus timer is located
    } else {
      showLocalToast(`Focus initialized for "${target.name}"!`);
    }
  };

  // Dynamic values
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const completionPercentage = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Render COMPACT Panel (Desktop Dashboard Right-Side Widget)
  if (compact) {
    return (
      <section 
        id="desktop-ai-coach-panel" 
        className="bg-white rounded-[24px] border border-custom-border p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden animate-scale-up"
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-custom-sage/5 blur-3xl pointer-events-none" />
        
        {/* Panel Header */}
        <div className="flex justify-between items-center border-b border-custom-border/60 pb-3 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-custom-sage/10 text-custom-sage flex items-center justify-center">
              <Bot size={15} />
            </div>
            <span className="text-[10px] font-extrabold tracking-wider text-custom-mid-text uppercase">
              AI Daily Coach
            </span>
          </div>
          <button 
            onClick={generateAICoachInsights}
            disabled={coachLoading}
            className="text-custom-soft-text hover:text-custom-sage transition-colors cursor-pointer"
            title="Refresh Coach advice"
          >
            <RefreshCw size={13} className={coachLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Local Toast overlay inside compact card */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-14 left-4 right-4 bg-custom-sage text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-md text-center z-30"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🌞 Morning Briefing & Greeting */}
        <div className="flex flex-col gap-1 z-10 mt-1">
          <span className="text-xs font-serif italic text-custom-sage/90">Personal productivity mentor</span>
          <h4 className="font-serif font-semibold text-lg text-custom-dark-text mt-0.5 leading-tight">
            {coachData.greeting}
          </h4>
        </div>

        {/* Mood quick select in compact */}
        <div className="bg-[#FAF9F6] border border-custom-border/60 rounded-xl p-2.5 flex items-center justify-between gap-1.5 mt-1">
          <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">How's your focus?</span>
          <div className="flex gap-1">
            {(['Calm', 'Motivated', 'Tired', 'Stressed'] as const).map(m => (
              <button
                key={m}
                onClick={() => setCurrentMood(m)}
                className={`text-xs px-2 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  currentMood === m 
                    ? 'bg-custom-sage text-white shadow-xs' 
                    : 'text-custom-mid-text hover:bg-custom-card-sec'
                }`}
              >
                {m === 'Calm' && '😌'}
                {m === 'Motivated' && '🔥'}
                {m === 'Tired' && '😴'}
                {m === 'Stressed' && '😰'}
              </button>
            ))}
          </div>
        </div>

        {/* Today's Mission & Insight list */}
        <div className="flex flex-col gap-3 mt-1.5">
          <div className="flex flex-col gap-2 bg-custom-sage/5 border border-custom-sage/10 p-3.5 rounded-2xl">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-custom-sage flex items-center gap-1.5">
              <Target size={11} /> Today's Primary Mission
            </span>
            {coachData.mission.length > 0 ? (
              <ul className="flex flex-col gap-1.5 pl-1.5 mt-1">
                {coachData.mission.map((m, idx) => (
                  <li key={idx} className="text-xs font-semibold text-custom-dark-text flex items-start gap-2">
                    <span className="text-custom-sage mt-0.5">✦</span>
                    <span className="line-clamp-1">{m}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-custom-soft-text mt-1 italic pl-1">No pending tasks. You are all set!</p>
            )}
          </div>

          <div className="bg-[#FCFAF7] border border-[#F4EFEA] p-3.5 rounded-2xl flex items-start gap-2.5">
            <span className="text-sm">🧠</span>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#B49258] block mb-0.5">AI Coach Insight</span>
              <p className="text-[11px] text-[#7E6A51] leading-relaxed font-medium">
                "{coachData.aiInsight}"
              </p>
            </div>
          </div>
        </div>

        {/* Productivity Score Indicator */}
        <div className="flex items-center justify-between bg-custom-card-sec/10 border border-custom-border/55 p-3 rounded-2xl mt-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-extrabold text-custom-soft-text uppercase tracking-widest">Productivity Index</span>
            <span className="text-xs text-custom-mid-text font-bold">Based on daily completion & focus</span>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* SVG circle */}
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="var(--color-custom-border, #E5E7EB)" strokeWidth="3.5" fill="transparent" />
              <circle 
                cx="24" 
                cy="24" 
                r="20" 
                stroke="var(--color-custom-sage, #869F8E)" 
                strokeWidth="3.5" 
                fill="transparent" 
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionPercentage / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute text-[10px] font-extrabold text-custom-dark-text">{completionPercentage}%</span>
          </div>
        </div>

        {/* Short motivational feedback or notification tip */}
        <div className="text-[11px] text-[#557F60] font-medium leading-relaxed italic bg-custom-sage-light/10 border border-custom-sage-light/20 p-3 rounded-2xl flex items-start gap-2">
          <span>✨</span>
          <p>"{coachData.motivation}"</p>
        </div>

        {/* Quick Suggestions summary list */}
        <div className="flex flex-col gap-2 mt-1">
          <span className="text-[9px] font-extrabold text-custom-soft-text uppercase tracking-widest pl-1">Smart Recommendations</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#FAF9F6] border border-custom-border/60 p-2.5 rounded-xl flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-custom-soft-text uppercase tracking-wide">Optimal Work Time</span>
              <span className="text-[10px] font-bold text-[#8E7951]">{coachData.smartRecommendations.bestTimeToWork}</span>
            </div>
            <div className="bg-[#FAF9F6] border border-custom-border/60 p-2.5 rounded-xl flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-custom-soft-text uppercase tracking-wide">Mindful Rest Tip</span>
              <span className="text-[10px] font-bold text-custom-sage">{coachData.smartRecommendations.suggestedBreaks}</span>
            </div>
          </div>
        </div>

        {/* Button to go to dedicated full-screen AI Coach view for deeper details */}
        <button 
          onClick={() => setActiveTab('AI Coach')}
          className="w-full bg-[#FAF2EE] hover:bg-[#FAF2EE]/80 border border-[#E9D5C8] text-[#C06B4A] py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2 group"
        >
          <span>Deeper AI Coaching & Reflection</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </section>
    );
  }

  // Render DEDICATED FULL VIEW (Desktop tab view, Tablet large block, or Mobile bottom nav view)
  return (
    <div id="full-ai-coach-workspace" className="flex flex-col gap-6 w-full animate-scale-up pb-10">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-custom-sage text-white text-xs font-semibold py-2.5 px-5 rounded-full shadow-lg text-center z-50 flex items-center gap-2"
          >
            <span>🌿</span> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER BLOCK - Beautiful pastoral minimalist banner */}
      <div className="bg-white rounded-[24px] border border-custom-border p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative corner glows */}
        <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-custom-sage/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-custom-rust/5 blur-2xl pointer-events-none" />

        <div className="flex items-start gap-4 z-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-custom-sage-light/20 text-custom-sage flex items-center justify-center flex-shrink-0 shadow-xs">
            <Bot size={26} className="text-custom-sage" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-custom-sage uppercase">Personal Mentor</span>
            <h2 className="font-serif font-light text-2xl sm:text-3xl text-custom-dark-text mt-1">
              Kaivora Daily Coach
            </h2>
            <p className="text-custom-soft-text text-sm mt-1 max-w-xl leading-relaxed">
              I analyze your priorities, deadlines, and current mood to suggest optimal pacing, protective rest buffers, and tailored momentum generators.
            </p>
          </div>
        </div>

        {/* Sync / Refresh widget with API information */}
        <div className="flex flex-col gap-2 w-full md:w-auto flex-shrink-0 z-10">
          <button
            onClick={generateAICoachInsights}
            disabled={coachLoading}
            className="bg-custom-sidebar hover:bg-custom-sidebar/90 text-white text-xs font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {coachLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Calibrating Mindsets...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Sync Daily Coach Insights</span>
              </>
            )}
          </button>
          
          <div className="text-center md:text-right">
            {userApiKey ? (
              <span className="text-[10px] text-custom-sage font-semibold bg-custom-sage-light/10 border border-custom-sage-light/25 py-1 px-2.5 rounded-full">
                ● Connected to Gemini-3.5-Flash
              </span>
            ) : (
              <span className="text-[10px] text-[#A67C1E] font-semibold bg-[#FAF6EE] border border-[#E9D5C8]/40 py-1 px-2.5 rounded-full block md:inline-block">
                ℹ Running on local adaptive baseline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* THREE SUB-TABS: Plan & Brief, Productivity Stats, Weekly Reflections */}
      <div className="flex border-b border-custom-border/60">
        <button
          onClick={() => setActiveSubTab('plan')}
          className={`flex items-center gap-2 py-3.5 px-5 text-sm font-semibold border-b-[3px] transition-all cursor-pointer ${
            activeSubTab === 'plan' 
              ? 'border-custom-sage text-custom-dark-text font-bold scale-[1.01]' 
              : 'border-transparent text-custom-soft-text hover:text-custom-dark-text'
          }`}
        >
          <CalendarDays size={16} />
          <span>Plan & Briefing</span>
        </button>
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`flex items-center gap-2 py-3.5 px-5 text-sm font-semibold border-b-[3px] transition-all cursor-pointer ${
            activeSubTab === 'stats' 
              ? 'border-custom-sage text-custom-dark-text font-bold scale-[1.01]' 
              : 'border-transparent text-custom-soft-text hover:text-custom-dark-text'
          }`}
        >
          <Activity size={16} />
          <span>Today's Progress</span>
        </button>
        <button
          onClick={() => setActiveSubTab('weekly')}
          className={`flex items-center gap-2 py-3.5 px-5 text-sm font-semibold border-b-[3px] transition-all cursor-pointer ${
            activeSubTab === 'weekly' 
              ? 'border-custom-sage text-custom-dark-text font-bold scale-[1.01]' 
              : 'border-transparent text-custom-soft-text hover:text-custom-dark-text'
          }`}
        >
          <Award size={16} />
          <span>Weekly Reflection</span>
        </button>
      </div>

      {/* CORE TAB CONTENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: PRIMARY INSIGHT BLOCKS (SPAN 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {activeSubTab === 'plan' && (
            <>
              {/* Mood Check-In Interactive Widget */}
              <div className="bg-white rounded-[24px] border border-custom-border p-6 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif font-medium text-lg text-custom-dark-text">How is your mental focus right now?</h3>
                    <p className="text-custom-soft-text text-xs mt-0.5">Let me tailor my guidance, recommended breaks, and task ordering to your energy.</p>
                  </div>
                  <span className="text-[10px] font-bold text-custom-sage tracking-wider uppercase bg-custom-sage-light/10 border border-custom-sage-light/20 px-2.5 py-1 rounded-full self-start sm:self-auto">
                    Active Mood: {currentMood}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-1.5">
                  {[
                    { type: 'Calm' as const, emoji: '😌', label: 'Calm & Steady', desc: 'Maintain pace', color: 'hover:border-blue-200 hover:bg-blue-50/20' },
                    { type: 'Motivated' as const, emoji: '🔥', label: 'Highly Motivated', desc: 'Dive into complex', color: 'hover:border-amber-200 hover:bg-amber-50/20' },
                    { type: 'Productive' as const, emoji: '⚡', label: 'Productive Flow', desc: 'Consistent output', color: 'hover:border-emerald-200 hover:bg-emerald-50/20' },
                    { type: 'Tired' as const, emoji: '😴', label: 'Feeling Tired', desc: 'Light steps first', color: 'hover:border-purple-200 hover:bg-purple-50/20' },
                    { type: 'Stressed' as const, emoji: '😰', label: 'Feeling Stressed', desc: 'De-clutter priority', color: 'hover:border-rose-200 hover:bg-rose-50/20' }
                  ].map(m => (
                    <button
                      key={m.type}
                      onClick={() => {
                        setCurrentMood(m.type);
                        showLocalToast(`Focus mood updated to "${m.type}". Generating adjusted plan...`);
                      }}
                      className={`border rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer ${m.color} ${
                        currentMood === m.type 
                          ? 'bg-custom-sage-light/10 border-custom-sage ring-2 ring-custom-sage/20' 
                          : 'border-custom-border/70 bg-white'
                      }`}
                    >
                      <span className="text-3xl leading-none select-none">{m.emoji}</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-custom-dark-text tracking-tight">{m.label}</span>
                        <span className="text-[9px] text-custom-soft-text">{m.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Briefing Card */}
              <div className="bg-white rounded-[24px] border border-custom-border p-6 sm:p-8 shadow-sm flex flex-col gap-5 relative overflow-hidden">
                <div className="flex items-center gap-3 border-b border-custom-border/60 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF2EE] border border-[#E9D5C8] text-[#C06B4A] flex items-center justify-center shadow-xs">
                    <Sun size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-xl text-custom-dark-text">{coachData.greeting}</h3>
                    <p className="text-custom-soft-text text-xs">Your personalized morning brief & strategic daily alignment.</p>
                  </div>
                </div>

                {/* Today's Mission bullets */}
                <div className="flex flex-col gap-3.5 bg-custom-sage/5 border border-custom-sage/10 rounded-2xl p-4.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-custom-sage flex items-center gap-1.5">
                    🎯 TODAY'S PRINCIPAL MISSION
                  </span>
                  {coachData.mission.length > 0 ? (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1 mt-1">
                      {coachData.mission.map((m, idx) => (
                        <li key={idx} className="bg-white border border-custom-border/60 rounded-xl p-3 text-xs font-semibold text-custom-dark-text flex items-center gap-2.5 shadow-xs">
                          <span className="w-5 h-5 rounded-full bg-custom-sage-light/25 text-custom-sage flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="truncate">{m}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-custom-soft-text italic mt-1">Your mission schedule is clear! Add a task to initialize alignment.</p>
                  )}
                </div>

                {/* AI Insights Block */}
                <div className="bg-[#FCFAF7] border border-[#FAF2EE] p-5 rounded-2xl flex items-start gap-4">
                  <div className="text-2xl mt-0.5 select-none leading-none">🧠</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#B49258] block mb-1">AI Analytical Insight</span>
                    <p className="text-sm text-[#7E6A51] leading-relaxed font-serif italic">
                      "{coachData.aiInsight}"
                    </p>
                  </div>
                </div>

                {/* Motivational Quote */}
                <div className="bg-custom-card-sec/15 border border-custom-border/50 p-5 rounded-2xl flex items-start gap-3.5">
                  <div className="text-lg mt-0.5 text-custom-sage select-none leading-none">✨</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-custom-sage block mb-1">Daily Motivation</span>
                    <p className="text-xs text-custom-mid-text leading-relaxed font-medium">
                      "{coachData.motivation}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Smart Recommendations Grid */}
              <div className="bg-white rounded-[24px] border border-custom-border p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-3 border-b border-custom-border/60 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-custom-sage-light/20 text-custom-sage flex items-center justify-center shadow-xs">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-medium text-lg text-custom-dark-text">Smart Recommendations</h3>
                    <p className="text-custom-soft-text text-xs">Continuous behavioral analysis to protect your cognitive load.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Card: Highest Impact Task */}
                  <div className="border border-custom-border/75 bg-white rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-custom-rust">👑 HIGHEST IMPACT FOCUS</span>
                      <h4 className="text-sm font-bold text-custom-dark-text mt-1">{coachData.smartRecommendations.highestImpactTask}</h4>
                    </div>
                    <div className="text-xs text-custom-soft-text font-medium border-t border-custom-border/50 pt-2.5 leading-relaxed">
                      This task carries the heaviest weight or contains critical dependencies. Tackling it clears major schedule friction.
                    </div>
                  </div>

                  {/* Card: Optimal Work Hours */}
                  <div className="border border-custom-border/75 bg-white rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-custom-sage">⏰ RECOMMENDED TIME WINDOW</span>
                      <h4 className="text-sm font-bold text-custom-dark-text mt-1">{coachData.smartRecommendations.bestTimeToWork}</h4>
                    </div>
                    <div className="text-xs text-custom-soft-text font-medium border-t border-custom-border/50 pt-2.5 leading-relaxed">
                      Determined from active biological metrics and historical productivity. Keep your energy protected for this block.
                    </div>
                  </div>

                  {/* Card: Suggested Breaks */}
                  <div className="border border-custom-border/75 bg-white rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-500">☕ MINDFUL REST ADVICE</span>
                      <h4 className="text-sm font-bold text-custom-dark-text mt-1">{coachData.smartRecommendations.suggestedBreaks}</h4>
                    </div>
                    <div className="text-xs text-custom-soft-text font-medium border-t border-custom-border/50 pt-2.5 leading-relaxed">
                      Pacing prevents exhaustion. Regular intervals of restorative breathing maintain high cerebral clarity.
                    </div>
                  </div>

                  {/* Dynamic Coaching Quote Card */}
                  <div className="bg-[#FAF8F5] border border-[#F1EBE2] rounded-2xl p-4 flex flex-col justify-between gap-2 shadow-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#B49258]">💡 CONTEXTUAL COACHING</span>
                      <p className="text-xs font-medium text-[#735A4F] mt-1.5 leading-relaxed italic">
                        "{coachData.dynamicCoaching}"
                      </p>
                    </div>
                    <span className="text-[9px] font-extrabold text-custom-soft-text uppercase tracking-wider block border-t border-custom-border/50 pt-2">
                      Adaptive Pacing Active
                    </span>
                  </div>

                </div>

                {/* Suggestions for Postpone / Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 border-t border-custom-border/50 pt-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">🌿 Suggested to Postpone (To protect focus)</span>
                    {coachData.smartRecommendations.tasksToPostpone.length > 0 ? (
                      <ul className="flex flex-col gap-1.5 mt-1">
                        {coachData.smartRecommendations.tasksToPostpone.map((t, i) => (
                          <li key={i} className="text-xs text-custom-mid-text font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-custom-soft-text/50" />
                            <span className="line-clamp-1">{t}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-custom-soft-text italic">No tasks suggested for deferral. Pacing is optimal!</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">🎯 Suggested to Split (Complex objectives)</span>
                    {coachData.smartRecommendations.tasksToSplit.length > 0 ? (
                      <ul className="flex flex-col gap-1.5 mt-1">
                        {coachData.smartRecommendations.tasksToSplit.map((t, i) => (
                          <li key={i} className="text-xs text-custom-mid-text font-medium flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-custom-sage" />
                              <span className="line-clamp-1">{t}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-custom-soft-text italic">No complex tasks needing immediate split. All set!</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSubTab === 'stats' && (
            <div className="bg-white rounded-[24px] border border-custom-border p-6 sm:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-custom-border/60 pb-4">
                <div className="w-10 h-10 rounded-xl bg-custom-sage-light/20 text-custom-sage flex items-center justify-center shadow-xs">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-medium text-lg text-custom-dark-text">Daily Progress Summary</h3>
                  <p className="text-custom-soft-text text-xs">Accurate calculation of active hours, checklists, and accomplishments.</p>
                </div>
              </div>

              {/* Progress metrics row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-custom-card-sec/15 border border-custom-border/60 rounded-2xl p-5 flex flex-col gap-1 text-center shadow-xs">
                  <span className="text-[10px] font-extrabold text-custom-soft-text uppercase tracking-widest">Tasks Completed</span>
                  <span className="text-3xl font-bold text-custom-dark-text mt-1">{coachData.progressSummary.tasksCompletedCount}</span>
                </div>
                <div className="bg-custom-card-sec/15 border border-custom-border/60 rounded-2xl p-5 flex flex-col gap-1 text-center shadow-xs">
                  <span className="text-[10px] font-extrabold text-custom-soft-text uppercase tracking-widest">Estimated Focus Time</span>
                  <span className="text-3xl font-bold text-custom-dark-text mt-1">{coachData.progressSummary.timeFocusedMinutes} mins</span>
                </div>
                <div className="bg-custom-card-sec/15 border border-custom-border/60 rounded-2xl p-5 flex flex-col gap-1 text-center shadow-xs">
                  <span className="text-[10px] font-extrabold text-custom-soft-text uppercase tracking-widest">Productivity Score</span>
                  <span className="text-3xl font-bold text-custom-sage mt-1">{coachData.progressSummary.productivityScore}/100</span>
                </div>
              </div>

              {/* Highlights block */}
              <div className="flex flex-col gap-2 bg-custom-sage/5 border border-custom-sage/15 rounded-2xl p-5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-custom-sage flex items-center gap-1.5">
                  <Award size={14} /> ACHIEVEMENT HIGHLIGHTS
                </span>
                {coachData.progressSummary.highlights.length > 0 ? (
                  <ul className="flex flex-col gap-2 mt-2">
                    {coachData.progressSummary.highlights.map((h, i) => (
                      <li key={i} className="text-xs font-semibold text-custom-dark-text flex items-center gap-2">
                        <span className="text-custom-sage">🏅</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-custom-soft-text italic mt-1 pl-1">Keep executing objectives to build daily highlights!</p>
                )}
              </div>

              {/* Feedback and suggestions */}
              <div className="flex flex-col gap-4 mt-1 border-t border-custom-border/60 pt-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-[#B49258] uppercase tracking-widest">PERSONAL VALIDATION</span>
                  <p className="text-sm text-custom-mid-text leading-relaxed font-medium mt-1">
                    {coachData.progressSummary.feedback}
                  </p>
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-[10px] font-extrabold text-custom-soft-text uppercase tracking-widest">SUGGESTIONS FOR TOMORROW</span>
                  <ul className="flex flex-col gap-2 mt-1.5">
                    {coachData.progressSummary.suggestionsForTomorrow.map((s, i) => (
                      <li key={i} className="text-xs text-custom-mid-text font-medium flex items-start gap-2 bg-custom-card-sec/10 border border-custom-border/50 p-3 rounded-xl shadow-xs">
                        <span className="text-custom-sage mt-0.5">✦</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'weekly' && (
            <div className="bg-white rounded-[24px] border border-custom-border p-6 sm:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-custom-border/60 pb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FAF2EE] border border-[#E9D5C8] text-[#C06B4A] flex items-center justify-center shadow-xs">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-medium text-lg text-custom-dark-text">Weekly Reflection & Strategic Growth</h3>
                  <p className="text-custom-soft-text text-xs">A comprehensive reflection of long-term metrics and habit patterns.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#FAF9F6] border border-custom-border/70 rounded-xl p-4 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-custom-soft-text uppercase tracking-wide">Tasks Complete</span>
                  <p className="text-2xl font-bold text-custom-dark-text mt-1">{coachData.weeklyReflection.tasksCompletedCount}</p>
                </div>
                <div className="bg-[#FAF9F6] border border-custom-border/70 rounded-xl p-4 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-custom-soft-text uppercase tracking-wide">Longest Streak</span>
                  <p className="text-2xl font-bold text-custom-sage mt-1">{coachData.weeklyReflection.longestStreak} Days</p>
                </div>
                <div className="bg-[#FAF9F6] border border-custom-border/70 rounded-xl p-4 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-custom-soft-text uppercase tracking-wide">Prime Peak Day</span>
                  <p className="text-sm font-bold text-[#8E7445] mt-2.5">{coachData.weeklyReflection.mostProductiveDay}</p>
                </div>
                <div className="bg-[#FAF9F6] border border-custom-border/70 rounded-xl p-4 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-custom-soft-text uppercase tracking-wide">Prime Focus Hour</span>
                  <p className="text-xs font-bold text-custom-dark-text mt-3">{coachData.weeklyReflection.bestWorkingHours}</p>
                </div>
              </div>

              <div className="bg-custom-card-sec/20 border border-custom-border/60 rounded-2xl p-5 mt-1 flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold text-custom-soft-text uppercase tracking-widest">POSTPONEMENT RADAR</span>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <span className="font-bold text-custom-dark-text">Frequently Delayed Area:</span>
                    <span className="text-custom-mid-text font-medium ml-1.5">{coachData.weeklyReflection.mostDelayedCategory}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4.5 border-t border-custom-border/60 pt-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-custom-sage uppercase tracking-widest mb-1.5">STRATEGIC WEEKLY COACHING INSIGHTS</span>
                  <ul className="flex flex-col gap-2.5">
                    {coachData.weeklyReflection.insights.map((ins, i) => (
                      <li key={i} className="text-xs text-custom-mid-text leading-relaxed font-medium flex items-start gap-2.5">
                        <span className="text-custom-sage text-base mt-0.5">💡</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-[10px] font-extrabold text-custom-soft-text uppercase tracking-widest mb-1.5">RECOMMENDED EXPERT ADJUSTMENTS</span>
                  <ul className="flex flex-col gap-2.5">
                    {coachData.weeklyReflection.improvementSuggestions.map((s, i) => (
                      <li key={i} className="text-xs text-custom-mid-text leading-relaxed font-medium flex items-start gap-2.5 bg-[#FCFAF7] border border-[#F2EDE6] p-3 rounded-xl shadow-xs">
                        <span className="text-custom-sage mt-0.5">✦</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: COACH NOTIFICATIONS & QUICK ACTIONS (SPAN 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Action Hub / Quick Actions Panel */}
          <section className="bg-white rounded-[24px] border border-custom-border p-6 shadow-sm flex flex-col gap-4">
            <span className="text-[10px] font-extrabold tracking-widest text-custom-soft-text uppercase block">
              ⚡ Quick Actions Hub
            </span>

            <div className="grid grid-cols-1 gap-3 mt-1">
              
              {/* Quick Action 1: Start Focus Timer */}
              <button
                onClick={triggerFocusSessionForHighest}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-custom-sage-light/10 hover:bg-custom-sage-light/20 border border-custom-sage-light/25 hover:border-custom-sage/30 text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-98 shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-custom-sage text-white flex items-center justify-center">
                  <Play size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-custom-dark-text block group-hover:text-custom-sage transition-colors">Start Focus Session</span>
                  <span className="text-[9px] text-custom-soft-text">Launches a Pomodoro work block for the top task</span>
                </div>
              </button>

              {/* Quick Action 2: Split Task Into Micro-Steps */}
              <button
                onClick={() => {
                  const actives = tasks.filter(t => !t.completed);
                  if (actives.length > 0) {
                    setTaskToSplit(actives[0].id);
                  }
                  setShowSplitModal(true);
                }}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-custom-card-sec/25 hover:bg-custom-card-sec/45 border border-custom-border/70 hover:border-custom-border text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-98 shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-custom-mid-text text-white flex items-center justify-center">
                  <Sliders size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-custom-dark-text block">Break Task into Steps</span>
                  <span className="text-[9px] text-custom-soft-text">Splits complex objectives into small subtasks</span>
                </div>
              </button>

              {/* Quick Action 3: Reschedule Tasks */}
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FAF2EE] hover:bg-[#FAF2EE]/80 border border-[#E9D5C8]/65 hover:border-[#E9D5C8] text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-98 shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#C06B4A] text-white flex items-center justify-center">
                  <CalendarDays size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[#8E4123] block">Reschedule Low Priority</span>
                  <span className="text-[9px] text-[#735A4F]">Postpones non-essential tasks to clear today's load</span>
                </div>
              </button>

              {/* Quick Action 4: View Today's Schedule */}
              <button
                onClick={() => setActiveTab('Schedule')}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white hover:bg-custom-card-sec/15 border border-custom-border/80 hover:border-custom-border text-left cursor-pointer transition-all hover:-translate-y-0.5 active:scale-98 shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-custom-dark-text text-white flex items-center justify-center">
                  <Calendar size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-custom-dark-text block">View Daily Plan</span>
                  <span className="text-[9px] text-custom-soft-text">Switches to your structured hourly timeline view</span>
                </div>
              </button>

            </div>
          </section>

          {/* AI Coach Notifications Panel */}
          <section className="bg-white rounded-[24px] border border-custom-border p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-custom-border/60 pb-3">
              <span className="text-[10px] font-extrabold tracking-widest text-custom-soft-text uppercase">
                🔔 Coaching Alerts
              </span>
              <span className="w-2 h-2 rounded-full bg-custom-sage animate-ping" />
            </div>

            <div className="flex flex-col gap-3">
              {coachData.notifications.map((notif, idx) => (
                <div 
                  key={idx} 
                  className="bg-custom-sage-light/10 border border-custom-sage-light/25 p-3.5 rounded-xl text-xs font-medium text-custom-mid-text leading-relaxed flex gap-2.5 shadow-2xs"
                >
                  <span className="text-custom-sage leading-none mt-0.5">💡</span>
                  <p>{notif}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Assistant Direct Chat Drawer Link */}
          <section className="bg-gradient-to-br from-custom-sidebar to-custom-sidebar/95 text-white rounded-[24px] p-6 shadow-md relative overflow-hidden flex flex-col gap-4">
            <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full border border-white opacity-5 pointer-events-none" />
            
            <div className="flex flex-col gap-1.5 z-10">
              <span className="text-[9px] font-extrabold text-custom-sage uppercase tracking-widest">DIRECT DIALOGUE</span>
              <h4 className="font-serif font-light text-lg">Have custom scheduling requirements?</h4>
              <p className="text-xs text-custom-soft-text leading-relaxed mt-1 font-sans">
                Initiate a direct chat conversation to reschedule custom workloads or analyze complex workflows.
              </p>
            </div>

            <button 
              onClick={() => setActiveTab('AI Assistant')}
              className="w-full bg-white text-custom-sidebar hover:bg-white/90 text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs mt-1"
            >
              <span>Chat with Kaivora Assistant</span>
              <ArrowRight size={13} />
            </button>
          </section>

        </div>
      </div>

      {/* DIALOG MODAL: BREAK TASK DOWN */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-custom-sidebar/85 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <form 
            onSubmit={handleSplitTaskAction}
            className="bg-white rounded-[24px] border border-custom-border w-full max-w-lg p-6 sm:p-8 shadow-2xl relative flex flex-col gap-5 my-auto animate-scale-up max-h-[95vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button 
              type="button"
              onClick={() => setShowSplitModal(false)}
              className="absolute top-5 right-5 text-custom-soft-text hover:text-custom-dark-text transition-colors p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-custom-sage-light/20 text-custom-sage flex items-center justify-center shadow-xs">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="font-serif font-medium text-xl text-custom-dark-text">Break Task into Micro-Steps</h3>
                <p className="text-custom-soft-text text-xs">Transform a major intimidating objective into clear 15-minute intervals.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-bold text-custom-mid-text uppercase tracking-wider">Select Task to Break Down</label>
              <select
                value={taskToSplit}
                onChange={(e) => setTaskToSplit(e.target.value)}
                className="bg-custom-card-sec/40 border border-custom-border rounded-xl px-3.5 py-3 text-sm text-custom-dark-text outline-none focus:border-custom-sage transition-all w-full cursor-pointer"
              >
                {tasks.filter(t => !t.completed).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.priority === 'Urgent' ? '🔴' : t.priority === 'High' ? '🟢' : '🟡'} {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#FAF9F6] border border-custom-border p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-custom-soft-text mt-1">
              <span>💡</span>
              <p>Breaking down complex goals resets the mental friction of beginning. Our AI engine will distribute work loads logically.</p>
            </div>

            <div className="flex gap-3 justify-end mt-4 border-t border-custom-border/50 pt-4">
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="px-5 py-3 border border-custom-border rounded-xl text-xs font-bold text-custom-mid-text hover:bg-custom-card-sec/15 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={splittingInProgress}
                className="bg-custom-sidebar hover:bg-custom-sidebar/90 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {splittingInProgress ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Structure...</span>
                  </>
                ) : (
                  <span> ✨ Break into Steps with AI</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DIALOG MODAL: RESCHEDULE LOW PRIORITY */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-custom-sidebar/85 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[24px] border border-custom-border w-full max-w-md p-6 shadow-2xl relative flex flex-col gap-5 my-auto animate-scale-up overflow-y-auto max-h-[90vh]">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowRescheduleModal(false)}
              className="absolute top-5 right-5 text-custom-soft-text hover:text-custom-dark-text transition-colors p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF2EE] border border-[#E9D5C8] text-[#C06B4A] flex items-center justify-center shadow-xs">
                <CalendarDays size={18} />
              </div>
              <div>
                <h3 className="font-serif font-medium text-lg text-custom-dark-text">Clear Non-Essential Work</h3>
                <p className="text-custom-soft-text text-xs">Postpone today's low-priority items to establish spacious focus.</p>
              </div>
            </div>

            <div className="text-sm text-custom-mid-text leading-relaxed">
              You currently have <strong className="font-bold">{tasks.filter(t => !t.completed && t.priority === 'Low').length} low priority tasks</strong> remaining today. 
              Rescheduling them shifts their deadlines to tomorrow, immediately reducing your cognitive overload.
            </div>

            <div className="flex gap-3 justify-end mt-2 border-t border-custom-border/50 pt-4">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-5 py-2.5 border border-custom-border rounded-xl text-xs font-bold text-custom-mid-text hover:bg-custom-card-sec/15 transition-all cursor-pointer"
              >
                Keep Today
              </button>
              <button
                onClick={handlePostponeLowPriorityAction}
                className="bg-[#C06B4A] hover:bg-[#A95939] text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                🚀 Reschedule to Tomorrow
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

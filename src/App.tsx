/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Target,
  Sparkles,
  Bell,
  Mic,
  Settings,
  Plus,
  Send,
  Check,
  Menu,
  Flame,
  ArrowRight,
  X,
  Loader2,
  AlertTriangle,
  Play,
  Volume2,
  Trash2,
  Clock,
  Moon,
  Sun,
  Activity,
  Bot,
  ChevronRight,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import VoiceProfilesPage, { VoiceProfile } from './components/VoiceProfilesPage';
import LifeArenasPage from './components/LifeArenasPage';
import AICoachPage from './components/AICoachPage';

interface ReminderLog {
  id: string;
  timestamp: string;
  level: number;
  message: string;
  reason: string;
  actionTaken?: string;
}

interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'rust' | 'gold';
  timestamp: string;
  read: boolean;
}

interface Task {
  id: string;
  name: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  deadline: string; // Used for raw date or visual display
  time?: string; // Hour in 24-hr format (e.g. "12:00")
  meta?: string;
  completed: boolean;
  completedAt?: string;
  shieldAwarded?: boolean;
  voiceProfileId?: string; // Assigned voice profile slot
  estimatedDuration?: number; // Estimated work duration in hours
  progress?: number; // Progress percentage (0 to 100)
  createdDate?: string; // e.g. "2026-06-26"
  reminderHistory?: ReminderLog[];
}

function getTaskRemainingTime(task: Task): string {
  if (task.completed) {
    return "Completed today";
  }

  if (!task.deadline) {
    return "No deadline set";
  }

  try {
    const now = new Date();
    
    // Construct target Date safely using manual local date constructor
    const [year, month, day] = task.deadline.split('-').map(Number);
    let hour = 23;
    let minute = 59;
    let second = 59;

    if (task.time) {
      const [h, m] = task.time.split(':').map(Number);
      hour = h;
      minute = m;
      second = 0;
    }

    const targetDate = new Date(year, month - 1, day, hour, minute, second);
    
    if (isNaN(targetDate.getTime())) {
      // Fallback if Date is invalid
      if (task.meta === "Completed today") {
        return `Due ${task.deadline}`;
      }
      return task.meta || `Due ${task.deadline}`;
    }

    const diffMs = targetDate.getTime() - now.getTime();
    const isOverdue = diffMs < 0;
    const absDiffMs = Math.abs(diffMs);

    const diffMins = Math.floor(absDiffMs / (1000 * 60));
    const diffHours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));

    if (isOverdue) {
      if (diffDays > 0) {
        return `Overdue by ${diffDays} day${diffDays === 1 ? '' : 's'}`;
      } else if (diffHours > 0) {
        return `Overdue by ${diffHours} hr${diffHours === 1 ? '' : 's'}`;
      } else if (diffMins > 0) {
        return `Overdue by ${diffMins} min${diffMins === 1 ? '' : 's'}`;
      } else {
        return "Overdue";
      }
    } else {
      if (diffDays > 0) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`;
      } else if (diffHours > 0) {
        const remainingMins = diffMins % 60;
        if (remainingMins > 0) {
          return `${diffHours} hr${diffHours === 1 ? '' : 's'} ${remainingMins} min remaining`;
        }
        return `${diffHours} hr${diffHours === 1 ? '' : 's'} remaining`;
      } else if (diffMins > 0) {
        return `${diffMins} min${diffMins === 1 ? '' : 's'} remaining`;
      } else {
        return "Due now";
      }
    }
  } catch (error) {
    if (task.meta === "Completed today") {
      return `Due ${task.deadline}`;
    }
    return task.meta || `Due ${task.deadline}`;
  }
}

const defaultTasks: Task[] = [
  { id: '1', name: 'Submit hackathon project', priority: 'Urgent', deadline: '2026-06-28', meta: '⏰ Due in 2 days', completed: false, estimatedDuration: 5, progress: 15, createdDate: '2026-06-25', reminderHistory: [] },
  { id: '2', name: 'Prepare presentation slides', priority: 'High', deadline: '2026-06-29', meta: '⏰ Due tomorrow', completed: false, estimatedDuration: 3, progress: 45, createdDate: '2026-06-25', reminderHistory: [] },
  { id: '3', name: 'Reply to client emails', priority: 'Medium', deadline: '2026-07-02', meta: '⏰ Due in 6 days', completed: false, estimatedDuration: 1.5, progress: 0, createdDate: '2026-06-25', reminderHistory: [] },
  { id: '4', name: 'Morning workout', priority: 'Low', deadline: '2026-06-26', meta: 'Completed today', completed: true, estimatedDuration: 1, progress: 100, createdDate: '2026-06-26', reminderHistory: [] }
];

export default function App() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).toUpperCase();
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const notified1HourTasksRef = useRef<Set<string>>(new Set());
  const notified30MinTasksRef = useRef<Set<string>>(new Set());
  const taskDeadlinesRef = useRef<Map<string, string>>(new Map());

  // APP STATES
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('kaivora_dark_mode') === 'true';
  });
  const [rotateIcon, setRotateIcon] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kaivora_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kaivora_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setRotateIcon(true);
    setIsDarkMode(prev => !prev);
    setTimeout(() => {
      setRotateIcon(false);
    }, 500);
  };

  const [activeTab, setActiveTab] = useState<'Dashboard' | 'My Tasks' | 'Streak & Badges' | 'Schedule' | 'Goals' | 'AI Assistant' | 'AI Coach' | 'Reminders' | 'Voice Profiles' | 'Settings' | 'Diagnostics' | 'Help'>('Dashboard');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [rightColumnTab, setRightColumnTab] = useState<'coach' | 'schedule' | 'chat'>('coach');
  const [isRightColumnCollapsed, setIsRightColumnCollapsed] = useState(false);

  // Auto close drawer and FAB on active tab change
  useEffect(() => {
    setIsDrawerOpen(false);
    setIsFabMenuOpen(false);
  }, [activeTab]);
  const [newTaskText, setNewTaskText] = useState('');
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Urgent');
  const [selectedVoiceProfileId, setSelectedVoiceProfileId] = useState<string>('');
  
  // Set default deadline date to today using local timezone
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Set default deadline time to 30 minutes from now for easy testing
  const [deadlineTime, setDeadlineTime] = useState(() => {
    const time = new Date(Date.now() + 30 * 60 * 1000);
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });

  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>(() => {
    const saved = localStorage.getItem('kaivora_voice_profiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'boss', name: 'Boss', emoji: '👔', isDefault: true },
      { id: 'mom', name: 'Mom', emoji: '👩', isDefault: true },
      { id: 'friend', name: 'Friend', emoji: '👫', isDefault: true },
      { id: 'dad', name: 'Dad', emoji: '👨', isDefault: true },
    ];
  });

  const [openVoiceDropdownTaskId, setOpenVoiceDropdownTaskId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('kaivora_tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Task[];
        return parsed.map(t => {
          if (!t.completed && t.meta === "Completed today") {
            return { ...t, meta: undefined };
          }
          return t;
        });
      } catch (e) {
        return defaultTasks;
      }
    }
    return defaultTasks;
  });

  // AI Reminder Intelligence Engine States
  const [learningData, setLearningData] = useState(() => {
    const saved = localStorage.getItem('kaivora_reminder_learning_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      preferredHoursStart: "09:00",
      preferredHoursEnd: "21:00",
      ignoredCount: 0,
      completedCount: 3,
      postponedCount: 0,
      fatiguePreventionCount: 4,
      postponedTasks: [] as string[]
    };
  });

  const [activeReminder, setActiveReminder] = useState<ReminderLog | null>(() => {
    const saved = localStorage.getItem('kaivora_active_reminder');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [isEvaluatingReminders, setIsEvaluatingReminders] = useState<boolean>(false);
  const [timeShiftDays, setTimeShiftDays] = useState<number>(0);
  const [activeReminderTab, setActiveReminderTab] = useState<'active' | 'learning' | 'simulator'>('active');
  const [reminderEngineLogs, setReminderEngineLogs] = useState<string[]>(() => {
    const saved = localStorage.getItem('kaivora_reminder_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return ["🌿 Reminder Engine Initialized.", "📊 Behavioral Matrix synced."];
  });

  useEffect(() => {
    localStorage.setItem('kaivora_reminder_learning_data', JSON.stringify(learningData));
  }, [learningData]);

  // Notifications State and Refs
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('kaivora_notifications_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'init-1',
        message: 'Welcome to Kaivora! Your AI-powered productivity companion is ready. 🌿',
        type: 'success',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      }
    ];
  });

  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Browser Notification states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [aiRemindersEnabled, setAiRemindersEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('kaivora_ai_reminders_enabled');
    return saved ? saved === 'true' : true;
  });

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast("Browser notifications are not supported by this browser.", "error");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setAiRemindersEnabled(true);
        localStorage.setItem('kaivora_ai_reminders_enabled', 'true');
        showToast("🔔 Notifications enabled! AI Reminders are now active.", "success");
        new Notification("Kaivora Companion Enabled", {
          body: "🌿 AI Reminders and deadline warnings will appear here.",
        });
      } else if (permission === 'denied') {
        // Keep AI Reminders enabled for in-app voice/audio alerts and toast notifications
        showToast("⚠️ Standard push notification blocked by browser policy (common in previews). But your in-app voice alarms and toasts remain active!", "rust", "top", 10000);
      }
    } catch (e) {
      console.error("Error requesting notification permission:", e);
    }
  };

  // Synchronize with browser notification permission on focus & periodically
  useEffect(() => {
    const syncPermission = () => {
      if ('Notification' in window) {
        const currentPermission = Notification.permission;
        setNotificationPermission(currentPermission);
        
        if (currentPermission === 'granted') {
          const saved = localStorage.getItem('kaivora_ai_reminders_enabled');
          if (saved === null) {
            setAiRemindersEnabled(true);
            localStorage.setItem('kaivora_ai_reminders_enabled', 'true');
          }
        }
      }
    };

    // Run on mount
    syncPermission();

    // Listen to focus and visibility change events
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);

    // Periodic polling to make sure it is updated
    const interval = setInterval(syncPermission, 3000);

    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
      clearInterval(interval);
    };
  }, []);

  const sendTestNotification = () => {
    if (!('Notification' in window)) {
      showToast("Browser notifications are not supported on this device/browser.", "error");
      return;
    }
    if (Notification.permission !== 'granted') {
      showToast("Please grant notification permission first before testing!", "error");
      return;
    }
    try {
      new Notification("🌿 Kaivora Test Notification", {
        body: "Success! Your browser alerts are fully configured and ready for smart coaching. 🚀",
      });
      showToast("Test notification dispatched! Check your desktop alerts.", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to dispatch test notification. Check system focus / Do Not Disturb.", "error");
    }
  };

  useEffect(() => {
    localStorage.setItem('kaivora_notifications_list', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('kaivora_active_reminder', activeReminder ? JSON.stringify(activeReminder) : '');
  }, [activeReminder]);

  useEffect(() => {
    localStorage.setItem('kaivora_reminder_logs', JSON.stringify(reminderEngineLogs));
  }, [reminderEngineLogs]);

  useEffect(() => {
    localStorage.setItem('kaivora_voice_profiles', JSON.stringify(voiceProfiles));
  }, [voiceProfiles]);

  // Unified Deadline Reminder Engine (Checks 1-Hour and 30-Minute thresholds)
  useEffect(() => {
    const speakTTS = (task: Task, profileName: string, type: '1hour' | '30min') => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let text = "";
        if (type === '1hour') {
          text = `Attention! Your pending task, ${task.name}, is due in one hour. This is a voice notification from your ${profileName}. Stay focused, you can do this!`;
        } else {
          text = `Hey, just a reminder from your ${profileName}. Don't forget to complete your pending task: ${task.name}. You've got this!`;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          if (profileName.toLowerCase().includes('dad') || profileName.toLowerCase().includes('boss')) {
            const maleVoice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('google us english') || v.name.toLowerCase().includes('david'));
            if (maleVoice) utterance.voice = maleVoice;
          } else if (profileName.toLowerCase().includes('mom')) {
            const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google uk english female') || v.name.toLowerCase().includes('zira'));
            if (femaleVoice) utterance.voice = femaleVoice;
          }
        }
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    };

    const triggerVoiceReminder = (task: Task, type: '1hour' | '30min') => {
      const assignedProfile = voiceProfiles.find(p => p.id === task.voiceProfileId);
      const profileName = assignedProfile ? assignedProfile.name : "System Voice";

      if (type === '1hour') {
        showToast(`⏰ One Hour Remaining! ${profileName} is reminding you: "${task.name}"`, "success", "top", 10000);
      } else {
        showToast(`⏰ 30 Minutes Remaining! ${profileName} is reminding you: "${task.name}"`, "success", "top", 8000);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("Kaivora Deadline Reminder", {
          body: type === '1hour' 
            ? `⏰ ${task.name} is due in 1 hour! Time to focus.` 
            : `⏰ ${task.name} is due in 30 minutes!`,
        });
      }

      if (assignedProfile && assignedProfile.audioBase64) {
        const audio = new Audio(assignedProfile.audioBase64);
        audio.play().catch(e => {
          console.error("Audio playback blocked, falling back to TTS:", e);
          speakTTS(task, profileName, type);
        });
      } else {
        speakTTS(task, profileName, type);
      }
    };

    const checkAllReminders = () => {
      if (!aiRemindersEnabled) return;

      const now = new Date();

      tasks.forEach((task) => {
        if (task.completed) return;
        if (!task.deadline) return;

        const deadlineStr = task.deadline;
        const timeStr = task.time || '12:00';

        try {
          const [year, month, day] = deadlineStr.split('-').map(Number);
          const [hour, minute] = timeStr.split(':').map(Number);
          const deadlineDateObj = new Date(year, month - 1, day, hour, minute, 0);

          if (isNaN(deadlineDateObj.getTime())) return;

          const diffMs = deadlineDateObj.getTime() - now.getTime();
          const diffMins = diffMs / (1000 * 60);

          // If this is the first time evaluating this task, or its deadline has changed:
          const deadlineKey = `${task.deadline}_${task.time || '12:00'}`;
          const isNewOrChanged = !taskDeadlinesRef.current.has(task.id) || taskDeadlinesRef.current.get(task.id) !== deadlineKey;

          if (isNewOrChanged) {
            taskDeadlinesRef.current.set(task.id, deadlineKey);
            // If the remaining time is already below the thresholds, mark them as notified
            // to prevent retroactive / immediate notifications on adding the task or app startup.
            if (diffMins <= 62) {
              notified1HourTasksRef.current.add(task.id);
            } else {
              notified1HourTasksRef.current.delete(task.id);
            }
            if (diffMins <= 32) {
              notified30MinTasksRef.current.add(task.id);
            } else {
              notified30MinTasksRef.current.delete(task.id);
            }
          }

          // 1. Check for 1-hour reminders (triggered strictly when remaining time is between 58 and 62 minutes)
          if (diffMins > 58 && diffMins <= 62) {
            if (!notified1HourTasksRef.current.has(task.id)) {
              notified1HourTasksRef.current.add(task.id);
              triggerVoiceReminder(task, '1hour');
            }
          }

          // 2. Check for 30-minute reminders (triggered strictly when remaining time is between 28 and 32 minutes)
          if (diffMins > 28 && diffMins <= 32) {
            if (!notified30MinTasksRef.current.has(task.id)) {
              notified30MinTasksRef.current.add(task.id);
              triggerVoiceReminder(task, '30min');
            }
          }
        } catch (e) {
          console.error("Failed to process task deadline for notification:", e);
        }
      });
    };

    checkAllReminders();
    // Check every 10 seconds to ensure high precision and instant notification when crossing thresholds
    const interval = setInterval(checkAllReminders, 10000);
    return () => clearInterval(interval);
  }, [tasks, voiceProfiles, aiRemindersEnabled]);

  // Request notification permission on page load safely without overriding user's in-app reminder preferences
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
          if (permission === 'granted') {
            setAiRemindersEnabled(true);
            localStorage.setItem('kaivora_ai_reminders_enabled', 'true');
            showToast("🔔 Notifications enabled! AI Reminders are now active.", "success");
            new Notification("Kaivora Companion Enabled", {
              body: "🌿 AI Reminders and deadline warnings will appear here.",
            });
          } else if (permission === 'denied') {
            // Keep user's in-app reminder pref. Show helpful notification about browser iframe limits.
            showToast("ℹ️ System notifications are restricted in this preview frame. In-app voice warnings are active!", "info");
          }
        });
      }
    }
  }, []);



  const [userApiKey, setUserApiKey] = useState(() => {
    return localStorage.getItem('kaivora_gemini_api_key') || '';
  });

  // SPEECH STATE
  const [isListening, setIsListening] = useState(false);

  // TOAST STATE
  const [toast, setToast] = useState<{ 
    message: string; 
    type: 'success' | 'error' | 'info' | 'rust' | 'gold'; 
    position?: 'top' | 'bottom-right';
  } | null>(null);

  // STREAK & BADGES STATE & LOGIC
  const [streakCount, setStreakCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('kaivora_streak_count') || '0', 10);
  });

  const [longestStreak, setLongestStreak] = useState<number>(() => {
    const savedLongest = parseInt(localStorage.getItem('kaivora_longest_streak') || '0', 10);
    const sCount = parseInt(localStorage.getItem('kaivora_streak_count') || '0', 10);
    return Math.max(savedLongest, sCount);
  });

  const [streakShields, setStreakShields] = useState<number>(() => {
    const savedCount = localStorage.getItem('kaivora_streak_shields_count');
    if (savedCount !== null) {
      return parseInt(savedCount, 10);
    }
    const oldShield = localStorage.getItem('kaivora_streak_shield') === 'true';
    return oldShield ? 1 : 0;
  });

  const [taskXP, setTaskXP] = useState<number>(() => {
    const saved = localStorage.getItem('kaivora_task_xp');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('kaivora_task_xp', taskXP.toString());
  }, [taskXP]);

  const awardXPForTaskCompletion = (task: Task, isAdding: boolean = true) => {
    if (!task.deadline) {
      const xp = 10;
      setTaskXP(prev => Math.max(0, prev + (isAdding ? xp : -xp)));
      return;
    }

    try {
      const now = new Date();
      const deadlineStr = task.deadline;
      const timeStr = task.time || '12:00';
      const [year, month, day] = deadlineStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      const deadlineDateObj = new Date(year, month - 1, day, hour, minute, 0);

      if (isNaN(deadlineDateObj.getTime())) {
        const xp = 10;
        setTaskXP(prev => Math.max(0, prev + (isAdding ? xp : -xp)));
        return;
      }

      const diffMs = deadlineDateObj.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 24) {
        // Completed 1 day or more before the deadline (before one day or two days)
        const xp = 20;
        setTaskXP(prev => Math.max(0, prev + (isAdding ? xp : -xp)));
        if (isAdding) {
          showToast("⭐ Early Completion! +20 XP awarded! 🚀", "success");
        }
      } else if (diffHours > 0) {
        // Completed within the timeline (under 24 hours remaining, e.g. 1 or 2 hours remaining)
        const xp = 10;
        setTaskXP(prev => Math.max(0, prev + (isAdding ? xp : -xp)));
        if (isAdding) {
          showToast("⭐ Timely Completion! +10 XP awarded! ⚡", "success");
        }
      } else {
        // Completed after the deadline (overdue)
        const xp = 5;
        setTaskXP(prev => Math.max(0, prev + (isAdding ? xp : -xp)));
        if (isAdding) {
          showToast("⭐ Completed! +5 XP awarded! 👍", "success");
        }
      }
    } catch (e) {
      const xp = 10;
      setTaskXP(prev => Math.max(0, prev + (isAdding ? xp : -xp)));
    }
  };

  const [earnedBadges, setEarnedBadges] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('kaivora_earned_badges');
    return saved ? JSON.parse(saved) : {};
  });

  const [achStats, setAchStats] = useState(() => {
    return {
      focusSessions: parseInt(localStorage.getItem('kaivora_ach_focus_sessions') || '0', 10),
      voiceTasks: parseInt(localStorage.getItem('kaivora_ach_voice_tasks') || '0', 10),
      rescueTasks: parseInt(localStorage.getItem('kaivora_ach_rescue_tasks') || '0', 10),
      aiCoachDays: parseInt(localStorage.getItem('kaivora_ach_ai_coach_days') || '0', 10),
      comebackHero: parseInt(localStorage.getItem('kaivora_ach_comeback_hero') || '0', 10),
      prodWizardDays: parseInt(localStorage.getItem('kaivora_ach_prod_wizard_days') || '0', 10),
    };
  });

  const [unlockedBadgePopup, setUnlockedBadgePopup] = useState<{ name: string; emoji: string; quoteOrDesc: string; isStreak: boolean } | null>(null);

  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number; duration: number; tilt: number }[]>([]);

  interface Badge {
    id: string;
    days: number;
    name: string;
    emoji: string;
    quote: string;
  }

  const BADGES: Badge[] = [
    { id: 'ignition', days: 3, name: "Ignition", emoji: "🔥", quote: "The spark has been lit!" },
    { id: 'current', days: 7, name: "Current", emoji: "⚡", quote: "You're electric. One full week!" },
    { id: 'rooted', days: 15, name: "Rooted", emoji: "🌱", quote: "Habits are forming. Stay grounded!" },
    { id: 'archer', days: 30, name: "Archer", emoji: "🏹", quote: "Focused, sharp, and on target!" },
    { id: 'sentinel', days: 50, name: "Sentinel", emoji: "🔰", quote: "Guarding your goals every single day!" },
    { id: 'warrior', days: 60, name: "Warrior", emoji: "⚔️", quote: "Two months of pure discipline!" },
    { id: 'diamond_mind', days: 100, name: "Diamond Mind", emoji: "💎", quote: "Unbreakable. Legendary consistency!" },
    { id: 'moonwalker', days: 150, name: "Moonwalker", emoji: "🌙", quote: "You operate on a different level entirely!" },
    { id: 'sovereign', days: 200, name: "Sovereign", emoji: "👑", quote: "You don't just set goals. You conquer them!" },
    { id: 'kaivora_legend', days: 365, name: "Kaivora Legend", emoji: "🌌", quote: "A full year. You ARE productivity itself!" },
    { id: 'productivity_titan', days: 500, name: "Productivity Titan", emoji: "🚀", quote: "A colossal force of unyielding momentum!" },
    { id: 'peak_performer', days: 730, name: "Peak Performer", emoji: "🏔️", quote: "Standing tall at the absolute summit of discipline!" },
    { id: 'master_strategist', days: 1000, name: "Master Strategist", emoji: "🧠", quote: "Four-digit mastery. Your mind is perfectly optimized!" },
    { id: 'life_architect', days: 1500, name: "Life Architect", emoji: "🌍", quote: "You shape your reality with deliberate action!" },
    { id: 'grandmaster_focus', days: 2000, name: "Grandmaster of Focus", emoji: "👑", quote: "A royal testament to unwavering concentration!" },
    { id: 'eternal_legend', days: 3000, name: "Eternal Legend", emoji: "💠", quote: "Infinite consistency, etched forever in the stars!" },
  ];

  interface AchievementBadge {
    id: string;
    name: string;
    desc: string;
    req: string;
    emoji: string;
    currentProgress: (stats: any, goalsList: any[], earnedList: any) => number;
    maxProgress: number;
  }

  const calculateArenaScoreInApp = (arenaId: string, goalsList: any[]) => {
    const arenaGoals = goalsList.filter((g: any) => g.arenaId === arenaId);
    if (arenaGoals.length === 0) return 0;
    const completedGoals = arenaGoals.filter((g: any) => g.completed);
    let totalScore = completedGoals.length * 100;
    const activeGoals = arenaGoals.filter((g: any) => !g.completed);
    activeGoals.forEach((g: any) => {
      if (!g.milestones || g.milestones.length === 0) {
        totalScore += 0;
      } else {
        const completedMilestones = g.milestones.filter((m: any) => m.completed).length;
        const progressPct = (completedMilestones / g.milestones.length) * 100;
        totalScore += progressPct;
      }
    });
    return totalScore / arenaGoals.length;
  };

  const ACHIEVEMENT_BADGES: AchievementBadge[] = [
    {
      id: 'focus_master',
      name: "Focus Master",
      desc: "Complete 100 Focus Sessions.",
      req: "100 Focus Sessions",
      emoji: "🧠",
      currentProgress: (stats) => stats.focusSessions,
      maxProgress: 100
    },
    {
      id: 'voice_commander',
      name: "Voice Commander",
      desc: "Add 100 tasks using Voice Input.",
      req: "100 Voice Tasks",
      emoji: "🎤",
      currentProgress: (stats) => stats.voiceTasks,
      maxProgress: 100
    },
    {
      id: 'deadline_defender',
      name: "Deadline Defender",
      desc: "Successfully complete 50 Rescue Mode tasks.",
      req: "50 Rescue Tasks",
      emoji: "🚨",
      currentProgress: (stats) => stats.rescueTasks,
      maxProgress: 50
    },
    {
      id: 'ai_explorer',
      name: "AI Explorer",
      desc: "Use AI Coach for 30 consecutive days.",
      req: "30 Consecutive Days",
      emoji: "🤖",
      currentProgress: (stats) => stats.aiCoachDays,
      maxProgress: 30
    },
    {
      id: 'goal_crusher',
      name: "Goal Crusher",
      desc: "Complete 100 Goals.",
      req: "100 Completed Goals",
      emoji: "🎯",
      currentProgress: (stats, goalsList) => goalsList.filter((g: any) => g.completed).length,
      maxProgress: 100
    },
    {
      id: 'comeback_hero',
      name: "Comeback Hero",
      desc: "Recover from 20 broken streaks using Streak Shield.",
      req: "20 Recoveries",
      emoji: "💪",
      currentProgress: (stats) => stats.comebackHero,
      maxProgress: 20
    },
    {
      id: 'productivity_wizard',
      name: "Productivity Wizard",
      desc: "Maintain a Productivity Score above 90 for 30 consecutive days.",
      req: "30 Days of Score > 90%",
      emoji: "⚡",
      currentProgress: (stats) => stats.prodWizardDays,
      maxProgress: 30
    },
    {
      id: 'balance_keeper',
      name: "Balance Keeper",
      desc: "Achieve at least 80% progress in Career, Health, Mind, and Wealth at the same time.",
      req: "All Arenas >= 80% progress",
      emoji: "🌿",
      currentProgress: (stats, goalsList) => {
        const career = calculateArenaScoreInApp('career', goalsList);
        const mind = calculateArenaScoreInApp('mind', goalsList);
        const health = calculateArenaScoreInApp('health', goalsList);
        const wealth = calculateArenaScoreInApp('wealth', goalsList);
        const achieved = [career, mind, health, wealth].every(score => score >= 80);
        return achieved ? 1 : 0;
      },
      maxProgress: 1
    },
    {
      id: 'hall_of_champion',
      name: "Hall of Champion",
      desc: "Complete every Life Arena milestone.",
      req: "All milestones completed (min 3 goals)",
      emoji: "🏆",
      currentProgress: (stats, goalsList) => {
        if (goalsList.length < 3) return 0;
        const allDone = goalsList.every((g: any) => g.milestones && g.milestones.length > 0 && g.milestones.every((m: any) => m.completed));
        return allDone ? 1 : 0;
      },
      maxProgress: 1
    },
    {
      id: 'kaivora_elite',
      name: "Kaivora Elite",
      desc: "Unlock every badge in the app.",
      req: "All 16 Streak Badges & 9 other Achievement Badges",
      emoji: "👑",
      currentProgress: (stats, goalsList, earnedList) => {
        const totalOtherBadges = 16 + 9; // 16 streak + 9 other achievements
        const earnedCount = Object.keys(earnedList).filter(id => id !== 'kaivora_elite').length;
        return earnedCount;
      },
      maxProgress: 25
    }
  ];

  const evaluateAllBadges = (customStreak?: number) => {
    const today = getTodayDateString();
    const currentStreakVal = customStreak !== undefined ? customStreak : streakCount;
    let goalsList: any[] = [];
    try {
      goalsList = JSON.parse(localStorage.getItem('kaivora_arena_goals') || '[]');
    } catch (e) {
      goalsList = [];
    }

    setEarnedBadges(prev => {
      const updated = { ...prev };
      const newlyEarnedList: any[] = [];

      // 1. Streak Badges
      BADGES.forEach(badge => {
        if (currentStreakVal >= badge.days && !updated[badge.id]) {
          updated[badge.id] = today;
          newlyEarnedList.push({
            name: badge.name,
            emoji: badge.emoji,
            quoteOrDesc: badge.quote,
            isStreak: true
          });
        }
      });

      // 2. Achievement Badges
      ACHIEVEMENT_BADGES.forEach(badge => {
        const progress = badge.currentProgress(achStats, goalsList, updated);
        if (progress >= badge.maxProgress && !updated[badge.id]) {
          updated[badge.id] = today;
          newlyEarnedList.push({
            name: badge.name,
            emoji: badge.emoji,
            quoteOrDesc: badge.desc,
            isStreak: false
          });
        }
      });

      if (newlyEarnedList.length > 0) {
        // Trigger popup celebration for first newly earned badge
        const firstBadge = newlyEarnedList[0];
        setTimeout(() => {
          setUnlockedBadgePopup(firstBadge);
          triggerConfetti();
          showToast(`🏆 Badge Unlocked: ${firstBadge.emoji} ${firstBadge.name}!`, "gold", "bottom-right", 6000);
        }, 300);
      }

      return updated;
    });
  };

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysDifference = (dateStr1: string, dateStr2: string) => {
    const d1 = new Date(dateStr1 + "T12:00:00");
    const d2 = new Date(dateStr2 + "T12:00:00");
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const triggerConfetti = () => {
    const colors = ['#D4AF37', '#C06B4A', '#8F9779', '#3B5998', '#E9D5C8', '#A64A2E', '#F2D2C4'];
    const newConfetti = Array.from({ length: 80 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6,
      delay: Math.random() * 1.5,
      duration: Math.random() * 2.5 + 2,
      tilt: Math.random() * 360,
    }));
    setConfetti(newConfetti);
    setTimeout(() => {
      setConfetti([]);
    }, 5000);
  };

  const getCurrentBadge = () => {
    const sorted = [...BADGES].sort((a, b) => b.days - a.days);
    const current = sorted.find(b => streakCount >= b.days);
    return current || null;
  };

  const checkForNewBadges = (streak: number) => {
    evaluateAllBadges(streak);
  };

  const awardShieldsIfNeeded = (completedTask?: Task, wasAlreadyAwarded = false, currentShieldsVal?: number) => {
    const today = getTodayDateString();

    // Max 1 streak shield per day constraint
    const lastShieldEarnedDate = localStorage.getItem('kaivora_last_shield_earned_date');
    if (lastShieldEarnedDate === today) {
      return;
    }

    const currentShields = currentShieldsVal !== undefined 
      ? currentShieldsVal 
      : parseInt(localStorage.getItem('kaivora_streak_shields_count') || '0', 10);

    let shieldsAwardedThisTurn = 0;
    let updatedShields = currentShields;
    let shouldMarkTaskShieldAwarded = false;

    // Rule 1: completing an Urgent task gives 1 streak shield (up to max 3 occupied)
    if (completedTask && completedTask.priority === 'Urgent' && !wasAlreadyAwarded) {
      if (updatedShields < 3) {
        updatedShields += 1;
        shieldsAwardedThisTurn += 1;
        shouldMarkTaskShieldAwarded = true;
        showToast("🛡️ Streak Shield Awarded for completing an Urgent task!", "success");
      }
    }

    // Rule 2: completing 3 high priority tasks (High or Urgent) in one day gives 1 streak shield (only if not already awarded in this check)
    if (shieldsAwardedThisTurn === 0) {
      const completedHighPriorityToday = tasks.filter(t => 
        t.completed && 
        t.completedAt === today && 
        (t.priority === 'High' || t.priority === 'Urgent') &&
        t.id !== completedTask?.id
      );

      let totalHighPriorityCount = completedHighPriorityToday.length;
      if (completedTask && (completedTask.priority === 'High' || completedTask.priority === 'Urgent')) {
        totalHighPriorityCount += 1;
      }

      const lastHighPriorityShieldDate = localStorage.getItem('kaivora_high_priority_shield_date');
      if (totalHighPriorityCount >= 3 && lastHighPriorityShieldDate !== today) {
        if (updatedShields < 3) {
          updatedShields += 1;
          shieldsAwardedThisTurn += 1;
          localStorage.setItem('kaivora_high_priority_shield_date', today);
          showToast("🛡️ Streak Shield Awarded for completing 3 high-priority tasks today!", "success");
        }
      }
    }

    if (shieldsAwardedThisTurn > 0) {
      setStreakShields(updatedShields);
      localStorage.setItem('kaivora_streak_shields_count', String(updatedShields));
      localStorage.setItem('kaivora_last_shield_earned_date', today);
    }

    if (shouldMarkTaskShieldAwarded && completedTask) {
      setTasks(prev => prev.map(t => t.id === completedTask.id ? { ...t, shieldAwarded: true } : t));
    }
  };

  const handleStreakOnCompletion = (completedTask?: Task, wasAlreadyAwarded = false) => {
    const today = getTodayDateString();
    const lastCompleted = localStorage.getItem('kaivora_last_completed_date');
    const currentStreak = parseInt(localStorage.getItem('kaivora_streak_count') || '0', 10);
    const currentShields = parseInt(localStorage.getItem('kaivora_streak_shields_count') || '0', 10);

    let newStreak = currentStreak;
    let newShields = currentShields;

    if (!lastCompleted || currentStreak === 0) {
      newStreak = 1;
      showToast("First task completed! Your streak begins! 🔥", "success");
    } else {
      const diff = getDaysDifference(lastCompleted, today);
      if (diff === 0) {
        // Already completed a task today, keep streak as-is
        awardShieldsIfNeeded(completedTask, wasAlreadyAwarded, currentShields);
        return;
      } else if (diff === 1) {
        // Consecutive day!
        newStreak = currentStreak + 1;
      } else {
        // Missed days
        const missedDays = diff - 1;
        if (currentShields >= missedDays) {
          newShields = currentShields - missedDays;
          newStreak = currentStreak + 1;
          setStreakShields(newShields);
          localStorage.setItem('kaivora_streak_shields_count', String(newShields));
          showToast(`🛡️ Used ${missedDays} Streak Shield(s) to protect your streak! Remaining: ${newShields}/3`, "success");
          setAchStats(prev => ({ ...prev, comebackHero: prev.comebackHero + missedDays }));
        } else {
          newShields = 0;
          setStreakShields(0);
          localStorage.setItem('kaivora_streak_shields_count', '0');
          newStreak = 1;
          showToast("Every champion starts again. Your streak begins today! 💪", "rust");
        }
      }
    }

    setStreakCount(newStreak);
    localStorage.setItem('kaivora_streak_count', String(newStreak));
    localStorage.setItem('kaivora_last_completed_date', today);

    // Check for newly earned badges
    checkForNewBadges(newStreak);

    // Award shields if completing this task warrants it
    awardShieldsIfNeeded(completedTask, wasAlreadyAwarded, newShields);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('kaivora_streak_count', String(streakCount));
    const savedLongest = parseInt(localStorage.getItem('kaivora_longest_streak') || '0', 10);
    if (streakCount > savedLongest) {
      localStorage.setItem('kaivora_longest_streak', String(streakCount));
      setLongestStreak(streakCount);
    }
  }, [streakCount]);

  useEffect(() => {
    localStorage.setItem('kaivora_streak_shields_count', String(streakShields));
  }, [streakShields]);

  useEffect(() => {
    localStorage.setItem('kaivora_earned_badges', JSON.stringify(earnedBadges));
  }, [earnedBadges]);

  useEffect(() => {
    localStorage.setItem('kaivora_ach_focus_sessions', String(achStats.focusSessions));
    localStorage.setItem('kaivora_ach_voice_tasks', String(achStats.voiceTasks));
    localStorage.setItem('kaivora_ach_rescue_tasks', String(achStats.rescueTasks));
    localStorage.setItem('kaivora_ach_ai_coach_days', String(achStats.aiCoachDays));
    localStorage.setItem('kaivora_ach_comeback_hero', String(achStats.comebackHero));
    localStorage.setItem('kaivora_ach_prod_wizard_days', String(achStats.prodWizardDays));
  }, [achStats]);

  // AI Coach daily visit tracking
  useEffect(() => {
    if (activeTab === 'AI Coach') {
      const recordAICoachUsage = () => {
        const today = getTodayDateString();
        const lastCoachDate = localStorage.getItem('kaivora_last_coach_usage_date');
        if (lastCoachDate === today) return; // already counted today

        setAchStats(prev => {
          let newDays = prev.aiCoachDays;
          if (!lastCoachDate) {
            newDays = 1;
          } else {
            const diff = getDaysDifference(lastCoachDate, today);
            if (diff === 1) {
              newDays = prev.aiCoachDays + 1;
            } else if (diff > 1) {
              newDays = 1; // reset streak of consecutive usage
            }
          }
          return { ...prev, aiCoachDays: newDays };
        });
        localStorage.setItem('kaivora_last_coach_usage_date', today);
      };
      recordAICoachUsage();
    }
  }, [activeTab]);

  // Unified evaluation trigger
  useEffect(() => {
    evaluateAllBadges();
  }, [activeTab, achStats, streakCount]);

  // Check streak on load
  useEffect(() => {
    const lastCompleted = localStorage.getItem('kaivora_last_completed_date');
    const savedStreak = parseInt(localStorage.getItem('kaivora_streak_count') || '0', 10);
    const savedShields = parseInt(localStorage.getItem('kaivora_streak_shields_count') || '0', 10);
    const today = getTodayDateString();

    if (lastCompleted && savedStreak > 0) {
      const diff = getDaysDifference(lastCompleted, today);
      const missedDays = diff - 1;
      if (missedDays > 0) {
        if (savedShields >= missedDays) {
          const remainingShields = savedShields - missedDays;
          setStreakShields(remainingShields);
          localStorage.setItem('kaivora_streak_shields_count', String(remainingShields));
          
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const year = yesterday.getFullYear();
          const month = String(yesterday.getMonth() + 1).padStart(2, '0');
          const day = String(yesterday.getDate()).padStart(2, '0');
          const yesterdayStr = `${year}-${month}-${day}`;
          localStorage.setItem('kaivora_last_completed_date', yesterdayStr);

          showToast(`🛡️ Used ${missedDays} Streak Shield(s) to protect your ${savedStreak} day streak! Remaining: ${remainingShields}/3.`, "success");
          setAchStats(prev => ({ ...prev, comebackHero: prev.comebackHero + missedDays }));
        } else {
          setStreakShields(0);
          localStorage.setItem('kaivora_streak_shields_count', '0');
          setStreakCount(0);
          localStorage.setItem('kaivora_streak_count', '0');
          showToast("Every champion starts again. Your streak begins today! 💪", "rust");
        }
      }
    }
  }, []);

  // MODAL/AI PLAN STATE
  const [activePlanTask, setActivePlanTask] = useState<Task | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<string>('');
  const [aiPlanError, setAiPlanError] = useState<string>('');
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>([false, false, false, false, false]);

  // RESCUE PLAN STATE
  const [isRescueModalOpen, setIsRescueModalOpen] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [rescuePlanText, setRescuePlanText] = useState<string>('');
  const [rescuePlanError, setRescuePlanError] = useState<string>('');

  // AI Assistant Chat state
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Dynamic opening message showing actual urgent task count
  useEffect(() => {
    const urgentCount = tasks.filter(t => !t.completed && t.priority === 'Urgent').length;
    const openingText = `👋 You have ${urgentCount} urgent task${urgentCount === 1 ? '' : 's'} due today. Want me to create a rescue plan or break down your next task into steps?`;
    setChatMessages(prev => {
      // If conversation is empty or still just the opening greeting, update/set it
      if (prev.length === 1 && prev[0].text === openingText) {
        return prev;
      }
      if (prev.length <= 1) {
        return [{ sender: 'ai', text: openingText }];
      }
      return prev;
    });
  }, [tasks]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessages.length > 1 || chatLoading) {
      const el = chatEndRef.current;
      if (el && el.parentElement) {
        el.parentElement.scrollTo({
          top: el.parentElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [chatMessages, chatLoading]);

  // AI SCHEDULE STATE & LOGIC
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const [scheduleItems, setScheduleItems] = useState<{ time: string; name: string; duration: string; priority?: string; dotColor: string }[]>(() => {
    const saved = localStorage.getItem('kaivora_schedule');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { time: '09:00 AM', name: 'Submit hackathon project', duration: '30m', priority: 'Urgent', dotColor: 'bg-custom-rust' },
      { time: '09:30 AM', name: 'Short Coffee Break', duration: '10m', priority: 'Break', dotColor: 'bg-blue-500' },
      { time: '09:40 AM', name: 'Standup & task refinement', duration: '15m', priority: 'High', dotColor: 'bg-custom-sage' },
      { time: '09:55 AM', name: 'Short Rest', duration: '10m', priority: 'Break', dotColor: 'bg-blue-500' },
      { time: '10:05 AM', name: 'Prepare presentation slides', duration: '1h 30m', priority: 'High', dotColor: 'bg-custom-sage' },
      { time: '11:35 AM', name: 'Short Rest', duration: '10m', priority: 'Break', dotColor: 'bg-blue-500' },
      { time: '11:45 AM', name: 'Reply to client emails', duration: '45m', priority: 'Medium', dotColor: 'bg-custom-gold' },
      { time: '12:30 PM', name: 'Lunch Break', duration: '1h 00m', priority: 'Break', dotColor: 'bg-blue-500' },
    ];
  });

  const [scheduleNote, setScheduleNote] = useState<string>(() => {
    return localStorage.getItem('kaivora_schedule_note') || "Every step forward is progress. Take a deep breath and start with the first task.";
  });

  const [scheduleQuote, setScheduleQuote] = useState<string>(() => {
    return localStorage.getItem('kaivora_schedule_quote') || "Your mind is for having ideas, not holding them. Trust the plan, execute with focus, and remember that I am right here with you.";
  });

  const handleTestVoice = (task: Task, profile: VoiceProfile) => {
    if (profile.audioBase64) {
      try {
        const audio = new Audio(profile.audioBase64);
        audio.play().then(() => {
          showToast(`🔊 Playing ${profile.name} voice!`, "success");
        }).catch(err => {
          console.error("Audio playback blocked, falling back to TTS:", err);
          const utterance = new SpeechSynthesisUtterance(task.name);
          window.speechSynthesis.speak(utterance);
          showToast(`🔊 Playing ${profile.name} voice via TTS!`, "success");
        });
      } catch (err) {
        console.error("Error creating Audio element:", err);
        const utterance = new SpeechSynthesisUtterance(task.name);
        window.speechSynthesis.speak(utterance);
        showToast(`🔊 Playing ${profile.name} voice via TTS!`, "success");
      }
    } else {
      const utterance = new SpeechSynthesisUtterance(task.name);
      window.speechSynthesis.speak(utterance);
      showToast(`🔊 Playing ${profile.name} voice via TTS!`, "success");
    }
  };

  // Helper to parse "09:00 AM" into minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Helper to parse "1h 30m" or "30m" into minutes
  const parseDurationToMinutes = (durationStr: string): number => {
    let totalMinutes = 0;
    const clean = durationStr.toLowerCase().trim();
    
    const hourMatch = clean.match(/(\d+)\s*h/);
    const minMatch = clean.match(/(\d+)\s*m/);
    
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1], 10) * 60;
    }
    if (minMatch) {
      totalMinutes += parseInt(minMatch[1], 10);
    } else if (!hourMatch && clean) {
      const numOnly = clean.replace(/[^\d]/g, '');
      if (numOnly) {
        totalMinutes += parseInt(numOnly, 10);
      }
    }
    return totalMinutes || 30; // default 30 mins
  };

  useEffect(() => {
    localStorage.setItem('kaivora_schedule', JSON.stringify(scheduleItems));
  }, [scheduleItems]);

  const handleGenerateSchedule = async () => {
    const tasksFromStorage = JSON.parse(localStorage.getItem('kaivora_tasks') || '[]');
    const activeTasks = tasksFromStorage.filter((t: any) => !t.completed);

    if (activeTasks.length === 0) {
      showToast("No tasks yet! Add some tasks from Dashboard first 📝", "error");
      return;
    }
    setScheduleLoading(true);
    setScheduleError('');

    try {
      const now = new Date();
      const currentLocalTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const tasksText = activeTasks.map((t: any) => `- "${t.name}" (Priority: ${t.priority}, Deadline: ${t.deadline || 'Today'})`).join('\n');
      const promptToSend = `Create a realistic schedule for today based on these tasks:\n${tasksText}\n\nCurrent time is ${currentLocalTimeStr}. Start schedule from current time. Add 10 minute breaks between tasks. Add lunch break if between 12-2pm. Format each item strictly as: TIME | TASK NAME | DURATION | PRIORITY — one per line, nothing else. End with an encouraging line starting with NOTE:`;

      const response = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          tasks: activeTasks,
          currentTime: currentLocalTimeStr,
          userApiKey: userApiKey,
          customPrompt: promptToSend
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate schedule");
      }

      const rawText = data.schedule || '';
      const lines = rawText.split('\n');
      const parsedItems: { time: string; name: string; duration: string; priority?: string; dotColor: string }[] = [];
      let noteText = "Every step forward is progress. Take a deep breath and start with the first task.";

      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        if (trimmed.toUpperCase().startsWith("NOTE:")) {
          noteText = trimmed.substring(5).trim();
          return;
        }

        // Remove markdown formatting or bold/asterisks
        const cleanLine = trimmed.replace(/\*\*/g, '').replace(/^\-\s+/, '').replace(/^\|\s+/, '');
        const parts = cleanLine.split('|');
        if (parts.length >= 3) {
          const time = parts[0].trim();
          const name = parts[1].trim();
          const duration = parts[2].trim();
          let priorityVal = parts[3] ? parts[3].trim() : '';

          if (!priorityVal) {
            if (name.toLowerCase().includes('break') || name.toLowerCase().includes('lunch') || name.toLowerCase().includes('coffee') || name.toLowerCase().includes('rest')) {
              priorityVal = 'Break';
            } else {
              priorityVal = 'Medium';
            }
          }

          let dotColor = 'bg-custom-soft-text/40';
          const normPriority = priorityVal.toLowerCase();
          if (normPriority.includes('urgent')) {
            dotColor = 'bg-custom-rust';
            priorityVal = 'Urgent';
          } else if (normPriority.includes('high')) {
            dotColor = 'bg-custom-sage';
            priorityVal = 'High';
          } else if (normPriority.includes('medium')) {
            dotColor = 'bg-custom-gold';
            priorityVal = 'Medium';
          } else if (normPriority.includes('low')) {
            dotColor = 'bg-custom-soft-text/60';
            priorityVal = 'Low';
          } else {
            dotColor = 'bg-blue-500';
            priorityVal = 'Break';
          }

          parsedItems.push({
            time,
            name,
            duration,
            priority: priorityVal,
            dotColor
          });
        }
      });

      if (parsedItems.length > 0) {
        setScheduleItems(parsedItems);
        setScheduleNote(noteText);
        localStorage.setItem('kaivora_schedule_note', noteText);

        const MOTIVATIONAL_QUOTES = [
          "Your mind is for having ideas, not holding them. Let's execute this perfect day together.",
          "Focus on progress, not perfection. Every scheduled interval completed is a victory.",
          "The secret of getting ahead is getting started. Today is your canvas — paint it with focus.",
          "You don't have to do it all at once; you just have to do the next scheduled block.",
          "Deep breath in, focus locked. Today is a brand new opportunity to make your future self proud."
        ];
        const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
        setScheduleQuote(randomQuote);
        localStorage.setItem('kaivora_schedule_quote', randomQuote);

        showToast("✨ Generated schedule successfully!", "success");
      } else {
        throw new Error("Could not parse schedule output. Please make sure to add tasks first.");
      }
    } catch (err: any) {
      console.error(err);
      setScheduleError(err.message || "Couldn't connect to AI. Check your API key in Settings.");
      showToast(err.message || "Couldn't connect to AI. Check your API key in Settings.", "error");
    } finally {
      setScheduleLoading(false);
    }
  };

  // Persist tasks
  useEffect(() => {
    localStorage.setItem('kaivora_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Escape key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRescueModalOpen(false);
        setActivePlanTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toast helper
  const showToast = (
    message: string, 
    type: 'success' | 'error' | 'info' | 'rust' | 'gold' = 'info', 
    position: 'top' | 'bottom-right' = 'bottom-right',
    duration = 4500
  ) => {
    setToast({ message, type, position });
    
    // Auto-archive as a past notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    const timer = setTimeout(() => {
      setToast(null);
    }, duration);
    return timer;
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const toggleReadStatus = (id: string) => {
    setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, read: !notif.read } : notif));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  interface RescueStep {
    time: string;
    action: string;
  }

  // Parse custom rescue plan text
  const parseRescuePlanText = (text: string) => {
    const lines = text.split('\n');
    const steps: RescueStep[] = [];
    let closingMessage = '';
    let quote = '';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract quote enclosed in quotes
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        quote = trimmed.replace(/"/g, '');
        return;
      }

      // Time parsing regex supporting various formats (e.g., 9:00-9:20 AM, 10:00 AM)
      const timeMatch = trimmed.match(/^(?:\s*[-*•\d\.\(\)]+\s*)?(?:\*\*)?((?:\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–—]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)|(?:\d{1,2}:\d{2}\s*(?:AM|PM)?))(?:\*\*)?\s*[:\-–—]?\s*(.*)$/i);
      if (timeMatch) {
        steps.push({
          time: timeMatch[1].trim(),
          action: timeMatch[2].replace(/\*\*/g, '').trim()
        });
      } else {
        // Look for quotes or append to closing message
        if (trimmed.toLowerCase().includes('quote') || trimmed.startsWith('—') || trimmed.startsWith('-')) {
          quote = trimmed.replace(/^(?:quote:?\s*|—\s*|-\s*)/i, '').replace(/"/g, '').trim();
        } else if (steps.length > 0) {
          closingMessage += (closingMessage ? ' ' : '') + trimmed.replace(/\*\*/g, '');
        }
      }
    });

    // Fallback quote extraction from closing text
    if (!quote && closingMessage) {
      const sentenceSplit = closingMessage.split('. ');
      if (sentenceSplit.length > 0) {
        quote = sentenceSplit[sentenceSplit.length - 1];
      }
    }

    if (!quote) {
      quote = "The secret of getting ahead is getting started. Focus on one small step, and momentum will carry you.";
    }

    return { steps, closingMessage, quote };
  };

  // Trigger Rescue Mode Emergency AI Plan
  const handleTriggerRescueMode = async () => {
    setIsRescueModalOpen(true);
    setRescueLoading(true);
    setRescuePlanText('');
    setRescuePlanError('');

    const urgentHighTasks = tasks.filter(t => (t.priority === 'Urgent' || t.priority === 'High') && !t.completed);

    if (urgentHighTasks.length === 0) {
      setRescueLoading(false);
      return;
    }

    // Helper to calculate due time milliseconds for sorting (soonest first)
    const getTaskDueTimeMs = (task: Task): number => {
      if (!task.deadline) return Infinity;
      try {
        let targetStr = task.deadline;
        if (task.time) {
          targetStr += `T${task.time}:00`;
        } else {
          targetStr += `T23:59:59`;
        }
        const targetDate = new Date(targetStr);
        return isNaN(targetDate.getTime()) ? Infinity : targetDate.getTime();
      } catch {
        return Infinity;
      }
    };

    // Sort urgent/high tasks so that the ones due soonest are first
    const sortedTasks = [...urgentHighTasks].sort((a, b) => getTaskDueTimeMs(a) - getTaskDueTimeMs(b));

    const taskListStr = sortedTasks.map(t => {
      const remainingStr = getTaskRemainingTime(t);
      const dueTimeStr = t.time ? ` at ${t.time}` : '';
      return `- ${t.name} (Due: ${t.deadline}${dueTimeStr}, Remaining: ${remainingStr})`;
    }).join('\n');

    // Get current local time details for exact synchronization
    const now = new Date();
    const currentLocalTimeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const currentLocalDateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    try {
      const response = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          taskName: "Emergency Rescue Plan",
          deadline: "Next 4 hours",
          priority: "Urgent/High Priority Rescue",
          userApiKey: userApiKey,
          customPrompt: `CRITICAL MANDATE: Create a perfect, detailed minute-by-minute rescue plan and schedule for the next 4 hours starting EXACTLY from the user's current local time which is ${currentLocalTimeStr} on ${currentLocalDateStr}.

The rescue plan MUST focus EXCLUSIVELY on completing the following urgent and high-priority tasks (sorted with the closest/soonest tasks first):
${taskListStr}

STRICT RULES:
1. START the schedule exactly at the current time: ${currentLocalTimeStr}. Do NOT start at 9:00 AM or any other default time. Calculate the 4-hour window from ${currentLocalTimeStr}.
2. PRIORITIZE the tasks with the shortest remaining time first in your schedule. The tasks are listed in priority order of proximity above. Start work on the most imminent tasks immediately.
3. Do NOT schedule, suggest, or introduce any irrelevant, filler, or unrelated tasks (such as checking email, doing chores, browsing, unrelated research, stretching, or general boilerplate tasks) unless they are strictly present in the user's task list above.
4. Every single time slot must be dedicated to a specific part, sub-step, or completion phase of one of the listed urgent/high tasks.
5. Make each step extremely clear, motivating, and immediately actionable.
6. Give specific, synchronized time slots based on the current local time (e.g., if the current time is 6:18 PM, write: "6:18 PM - 6:45 PM: Work on [Task Name], focusing on [specific sub-task]").
7. End with an encouraging message and a short motivational quote at the very end wrapped in double quotes.`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to build rescue plan");
      }

      setRescuePlanText(data.plan);
    } catch (err: any) {
      console.error(err);
      setRescuePlanError(err.message || "Couldn't connect to AI. Check your API key in Settings.");
    } finally {
      setRescueLoading(false);
    }
  };

  // --- AI REMINDER INTELLIGENCE ENGINE IMPLEMENTATION ---

  const [focusTimerTask, setFocusTimerTask] = useState<Task | null>(null);
  const [focusTimerSeconds, setFocusTimerSeconds] = useState<number>(1500); // 25 min Pomodoro
  const [isFocusTimerActive, setIsFocusTimerActive] = useState<boolean>(false);
  const [isSplittingTask, setIsSplittingTask] = useState<string | null>(null);

  // Focus Timer Tick Effect
  useEffect(() => {
    let interval: any = null;
    if (isFocusTimerActive && focusTimerSeconds > 0) {
      interval = setInterval(() => {
        setFocusTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (focusTimerSeconds === 0 && isFocusTimerActive) {
      setIsFocusTimerActive(false);
      if (focusTimerTask) {
        handleReminderActionMarkComplete(focusTimerTask.id);
        showToast(`🎉 Focus Session completed! "${focusTimerTask.name}" has been completed!`, "success");
        setAchStats(prev => ({ ...prev, focusSessions: prev.focusSessions + 1 }));
      }
    }
    return () => clearInterval(interval);
  }, [isFocusTimerActive, focusTimerSeconds, focusTimerTask]);

  // Core Evaluation Trigger
  const triggerReminderEvaluation = async () => {
    setIsEvaluatingReminders(true);
    
    // Construct simulated date based on time-shift slider
    const simulatedDate = new Date(Date.now() + timeShiftDays * 24 * 60 * 60 * 1000);
    const timeString = simulatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = simulatedDate.toLocaleDateString();
    const fullSimulatedTime = `${dateString} ${timeString}`;

    // Prepare tasks with required properties for AI
    const preparedTasks = tasks.map(t => ({
      id: t.id,
      name: t.name,
      priority: t.priority,
      deadline: t.deadline,
      time: t.time || "23:59",
      completed: t.completed,
      progress: t.progress ?? (t.completed ? 100 : 0),
      estimatedDuration: t.estimatedDuration ?? 2,
      createdDate: t.createdDate ?? "2026-06-25",
      reminderHistory: t.reminderHistory || []
    }));

    try {
      const response = await fetch('/api/ai-reminders/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          tasks: preparedTasks,
          currentTime: fullSimulatedTime,
          learningData: {
            preferredHours: `${learningData.preferredHoursStart} - ${learningData.preferredHoursEnd}`,
            ignoredCount: learningData.ignoredCount,
            completedCount: learningData.completedCount,
            postponedCount: learningData.postponedCount,
            fatiguePreventionCount: learningData.fatiguePreventionCount,
            postponedTasks: learningData.postponedTasks
          },
          userApiKey: userApiKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to evaluate reminders");
      }

      const timestamp = simulatedDate.toLocaleString();

      if (data.shouldRemind && data.taskId) {
        const matchedTask = tasks.find(t => t.id === data.taskId);
        if (matchedTask) {
          const newLog: ReminderLog = {
            id: Date.now().toString(),
            timestamp,
            level: data.level || 1,
            message: data.message || "",
            reason: data.reason || "",
          };

          // Update task's history and active state
          setTasks(prev => prev.map(t => {
            if (t.id === data.taskId) {
              const hist = t.reminderHistory ? [...t.reminderHistory, newLog] : [newLog];
              return { ...t, reminderHistory: hist };
            }
            return t;
          }));

          setActiveReminder({
            id: newLog.id,
            timestamp,
            level: data.level || 1,
            message: data.message,
            reason: data.reason,
            actionTaken: undefined
          });

          setReminderEngineLogs(prev => [
            `[${timeString}] 🔔 Triggered Level ${data.level} Reminder for "${matchedTask.name}". Reason: ${data.reason}`,
            ...prev
          ]);

          showToast(`🔔 AI Reminder issued for "${matchedTask.name}"!`, "info");

          // Trigger native browser notification
          if ('Notification' in window && Notification.permission === 'granted' && aiRemindersEnabled) {
            new Notification(`Kaivora AI Alert (Level ${data.level || 1})`, {
              body: `Regarding "${matchedTask.name}": ${data.message}`,
            });
          }
        } else {
          // Task not found fallback
          setReminderEngineLogs(prev => [
            `[${timeString}] 🛡️ AI analyzed focus: No immediate action needed. Reasoning: ${data.analysis}`,
            ...prev
          ]);
        }
      } else {
        // AI decided to suppress / mute reminder
        setActiveReminder(null);
        setLearningData(prev => ({
          ...prev,
          fatiguePreventionCount: prev.fatiguePreventionCount + 1
        }));

        setReminderEngineLogs(prev => [
          `[${timeString}] 🛡️ Focus protected: Suppressed. Reasoning: ${data.analysis}`,
          ...prev
        ]);

        showToast("🌿 Focus Protected: AI bypassed notification noise to prevent fatigue.", "success");
      }

    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Couldn't evaluate. Check your API key in Settings.", "error");
    } finally {
      setIsEvaluatingReminders(false);
    }
  };

  // Mark task complete action
  const handleReminderActionMarkComplete = (taskId: string) => {
    const today = getTodayDateString();
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: true,
          completedAt: today,
          progress: 100
        };
      }
      return t;
    }));

    // Trigger standard rewards system in Kaivora if applicable
    const completedTaskObj = tasks.find(t => t.id === taskId);
    if (completedTaskObj) {
      // Re-evaluate shields / streaks if these methods exist (they are defined in original file)
      try {
        if (typeof handleStreakOnCompletion === 'function') {
          handleStreakOnCompletion(completedTaskObj, completedTaskObj.shieldAwarded);
        }
      } catch(e){}
      awardXPForTaskCompletion(completedTaskObj, true);
    }

    setLearningData(prev => ({
      ...prev,
      completedCount: prev.completedCount + 1
    }));

    if (activeReminder) {
      setActiveReminder(null);
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setReminderEngineLogs(prev => [
      `[${timeString}] ✅ Action Taken: User marked task completed. Reward registered.`,
      ...prev
    ]);

    showToast("Task completed! Momentum increased! ⚡", "success");
  };

  // Remind later / Postpone action
  const handleReminderActionRemindLater = (taskId: string) => {
    const matchedTask = tasks.find(t => t.id === taskId);
    const taskName = matchedTask ? matchedTask.name : "Unknown Task";

    setLearningData(prev => {
      const alreadyPostponed = prev.postponedTasks || [];
      const updatedPostponed = alreadyPostponed.includes(taskName) 
        ? alreadyPostponed 
        : [...alreadyPostponed, taskName];

      return {
        ...prev,
        ignoredCount: prev.ignoredCount + 1,
        postponedCount: prev.postponedCount + 1,
        postponedTasks: updatedPostponed
      };
    });

    if (activeReminder) {
      setActiveReminder(null);
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setReminderEngineLogs(prev => [
      `[${timeString}] ⏰ Action Taken: User postponed reminder. AI logged this behavioral preference.`,
      ...prev
    ]);

    showToast("Reminder postponed. Adaptive learning updated. 🌿", "info");
  };

  // Reschedule Task 2 days out
  const handleReminderActionReschedule = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentDate = new Date(t.deadline);
        currentDate.setDate(currentDate.getDate() + 2); // Reschedule by 2 days
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const nextDeadline = `${year}-${month}-${day}`;
        
        return {
          ...t,
          deadline: nextDeadline,
          meta: `⏰ Due in 2 days (AI Rescheduled)`
        };
      }
      return t;
    }));

    if (activeReminder) {
      setActiveReminder(null);
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setReminderEngineLogs(prev => [
      `[${timeString}] 📅 Action Taken: Task rescheduled 2 days forward. Lower-priority space cleared.`,
      ...prev
    ]);

    showToast("Task rescheduled by 2 days. Relax, you have time! 🌸", "success");
  };

  // AI Task Splitter Action
  const handleReminderActionSplit = async (taskId: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    setIsSplittingTask(taskId);
    setReminderEngineLogs(prev => [
      `[AI Splitting] ✂️ Generating bite-sized breakdown for "${targetTask.name}"...`,
      ...prev
    ]);

    try {
      const response = await fetch('/api/ai-reminders/split-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          taskName: targetTask.name,
          estimatedDuration: targetTask.estimatedDuration || 2,
          priority: targetTask.priority,
          deadline: targetTask.deadline,
          userApiKey: userApiKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to split task");
      }

      if (data.subtasks && data.subtasks.length > 0) {
        // Create actual tasks from these subtasks!
        const newSubtasksList = data.subtasks.map((sub: any, i: number) => {
          return {
            id: `sub-${Date.now()}-${i}`,
            name: `↳ Step ${i+1}: ${sub.name}`,
            priority: sub.priority || targetTask.priority,
            deadline: targetTask.deadline,
            time: targetTask.time,
            meta: `⏱️ Step takes ${sub.estimatedDuration} hrs (Split from "${targetTask.name}")`,
            completed: false,
            progress: 0,
            estimatedDuration: sub.estimatedDuration,
            createdDate: getTodayDateString(),
            reminderHistory: []
          };
        });

        // Insert new subtasks and mark the old task as completed (or let's set its progress to 100% or mark completed so they focus on steps!)
        setTasks(prev => {
          const filtered = prev.filter(t => t.id !== taskId);
          return [...newSubtasksList, ...filtered];
        });

        if (activeReminder) {
          setActiveReminder(null);
        }

        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setReminderEngineLogs(prev => [
          `[${timeString}] ✂️ Action Taken: Task split into ${data.subtasks.length} subtasks successfully.`,
          ...prev
        ]);

        showToast(`✂️ Successfully split into ${data.subtasks.length} step-by-step tasks!`, "success");
      }
    } catch(err: any) {
      console.error(err);
      showToast(err.message || "Could not split task. Check your API key.", "error");
    } finally {
      setIsSplittingTask(null);
    }
  };

  const handleReminderActionStartFocus = (taskId: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (targetTask) {
      setFocusTimerTask(targetTask);
      setFocusTimerSeconds(1500); // 25 mins Pomodoro
      setIsFocusTimerActive(true);
      showToast(`🎯 Focus Session initialized for "${targetTask.name}"!`, "success");
    }
  };

  // --- END OF AI REMINDER INTELLIGENCE ENGINE IMPLEMENTATION ---

  // Add a task handler
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    // Format the visual meta with the exact time
    const [hoursStr, minutesStr] = deadlineTime.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formattedTime = `${displayHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;

    const daysDiff = Math.ceil((new Date(deadlineDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    let visualMeta = `⏰ Due ${deadlineDate} at ${formattedTime}`;
    if (daysDiff === 0) {
      visualMeta = `⏰ Due today at ${formattedTime}`;
    } else if (daysDiff === 1) {
      visualMeta = `⏰ Due tomorrow at ${formattedTime}`;
    } else if (daysDiff > 1) {
      visualMeta = `⏰ Due in ${daysDiff} days at ${formattedTime}`;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      name: newTaskText.trim(),
      priority: priority,
      deadline: deadlineDate,
      time: deadlineTime,
      meta: visualMeta,
      completed: false,
      voiceProfileId: selectedVoiceProfileId || undefined,
      createdDate: getTodayDateString(),
      reminderHistory: []
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTaskText('');
    setSelectedVoiceProfileId('');
    showToast("Task added successfully!", "success");

    // Focus text input again
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Handle unchecking a task to revert any shields and streak if applicable
  const handleStreakOnUncheck = (uncheckedTask: Task) => {
    const today = getTodayDateString();
    let updatedShields = streakShields;
    let shieldsRemoved = 0;

    // 1. If this task itself had "shieldAwarded" true (Urgent task reward)
    if (uncheckedTask.shieldAwarded) {
      if (updatedShields > 0) {
        updatedShields -= 1;
        shieldsRemoved += 1;
        showToast("🛡️ Streak Shield removed (Urgent task unchecked)", "info");
      }
    }

    // 2. If this task was part of "completing 3 high priority tasks in one day" shield rule
    if (uncheckedTask.priority === 'High' || uncheckedTask.priority === 'Urgent') {
      const lastHighPriorityShieldDate = localStorage.getItem('kaivora_high_priority_shield_date');
      if (lastHighPriorityShieldDate === today) {
        // Count how many completed High/Urgent tasks we have TODAY in our tasks array
        const completedHighPriorityToday = tasks.filter(t => 
          t.completed && 
          t.completedAt === today && 
          (t.priority === 'High' || t.priority === 'Urgent')
        );

        // Since we are unchecking one of them, the count drops below 3
        if (completedHighPriorityToday.length >= 3 && (completedHighPriorityToday.length - 1) < 3) {
          if (updatedShields > 0) {
            updatedShields -= 1;
            shieldsRemoved += 1;
          }
          localStorage.removeItem('kaivora_high_priority_shield_date');
          showToast("🛡️ Streak Shield removed (high-priority task count fell below 3)", "info");
        }
      }
    }

    if (shieldsRemoved > 0) {
      setStreakShields(updatedShields);
      localStorage.setItem('kaivora_streak_shields_count', String(updatedShields));
      localStorage.removeItem('kaivora_last_shield_earned_date');
    }

    // 3. Revert the streak if today has no other completed tasks
    const otherCompletedToday = tasks.filter(t => 
      t.id !== uncheckedTask.id && 
      t.completed && 
      t.completedAt === today
    );

    if (otherCompletedToday.length === 0) {
      const lastCompleted = localStorage.getItem('kaivora_last_completed_date');
      if (lastCompleted === today) {
        // Revert streak count
        const prevStreak = Math.max(0, streakCount - 1);
        setStreakCount(prevStreak);
        localStorage.setItem('kaivora_streak_count', String(prevStreak));

        // Revert badges that require a higher streak
        setEarnedBadges(prev => {
          const updated = { ...prev };
          let changed = false;
          BADGES.forEach(badge => {
            if (badge.days > prevStreak && updated[badge.id]) {
              delete updated[badge.id];
              changed = true;
            }
          });
          return changed ? updated : prev;
        });

        // Restore the previous last completed date
        const prevCompletedTasks = tasks.filter(t => 
          t.id !== uncheckedTask.id && 
          t.completed && 
          t.completedAt && 
          t.completedAt !== today
        );

        if (prevCompletedTasks.length > 0) {
          const dates = prevCompletedTasks.map(t => t.completedAt as string);
          dates.sort((a, b) => b.localeCompare(a));
          const lastDate = dates[0];
          localStorage.setItem('kaivora_last_completed_date', lastDate);
        } else {
          localStorage.removeItem('kaivora_last_completed_date');
        }

        showToast("🔥 Streak reverted (no completed tasks today)", "info");
      }
    }
  };

  // Toggle complete state
  const toggleTaskCompletion = (taskId: string) => {
    const today = getTodayDateString();
    const taskBefore = tasks.find(t => t.id === taskId);
    if (!taskBefore) return;

    const becameCompleted = !taskBefore.completed;

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { 
          ...t, 
          completed: becameCompleted,
          completedAt: becameCompleted ? today : undefined,
          shieldAwarded: becameCompleted ? t.shieldAwarded : false,
          meta: becameCompleted 
            ? "Completed today" 
            : (t.meta === "Completed today" ? undefined : t.meta)
        };
      }
      return t;
    }));

    if (becameCompleted) {
      const completedTaskObj = {
        ...taskBefore,
        completed: true,
        completedAt: today
      };
      handleStreakOnCompletion(completedTaskObj, taskBefore.shieldAwarded);
      awardXPForTaskCompletion(taskBefore, true);

      // Increment Rescue Mode task count if active during Rescue Mode
      if (isRescueModalOpen || taskBefore.priority === "Urgent/High Priority Rescue") {
        setAchStats(prev => ({ ...prev, rescueTasks: prev.rescueTasks + 1 }));
      }

      // Update Productivity score >90 consecutive days stat
      const todayTasks = tasks.map(t => t.id === taskId ? { ...t, completed: true } : t);
      const completedCount = todayTasks.filter(t => t.completed).length;
      const score = todayTasks.length > 0 ? (completedCount / todayTasks.length) * 100 : 0;
      if (score >= 90) {
        const lastScoreDate = localStorage.getItem('kaivora_last_high_prod_date');
        if (lastScoreDate !== today) {
          setAchStats(prev => {
            let newDays = prev.prodWizardDays;
            if (!lastScoreDate) {
              newDays = 1;
            } else {
              const diff = getDaysDifference(lastScoreDate, today);
              if (diff === 1) {
                newDays = prev.prodWizardDays + 1;
              } else if (diff > 1) {
                newDays = 1;
              }
            }
            return { ...prev, prodWizardDays: newDays };
          });
          localStorage.setItem('kaivora_last_high_prod_date', today);
        }
      }
    } else {
      handleStreakOnUncheck(taskBefore);
      awardXPForTaskCompletion(taskBefore, false);
    }
  };

  // Delete task
  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== taskId));
    showToast("Task deleted", "info");
  };

  // Web Speech API
  const startSpeechRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech recognition is not supported in this browser. Try Chrome, Safari or Edge.", "error");
      return;
    }

    if (isListening) return;

    // First request microphone permission properly using the browser's mediaDevices API
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission granted! Stop tracks immediately so we don't hold the mic active yet
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error("Microphone permission denied:", err);
      showToast(
        "🎤 Please allow microphone access — click the 🔒 lock icon in your browser address bar and enable Microphone permission, then refresh the page",
        "rust",
        "top",
        5000
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setNewTaskText(transcript);
          showToast("✅ Voice captured!", "success", "bottom-right", 2000);
          setAchStats(prev => ({ ...prev, voiceTasks: prev.voiceTasks + 1 }));
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          showToast(
            "🎤 Please allow microphone access — click the 🔒 lock icon in your browser address bar and enable Microphone permission, then refresh the page",
            "rust",
            "top",
            5000
          );
        } else {
          showToast(`Speech recognition error: ${event.error}`, "error");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Save custom API key
  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('kaivora_gemini_api_key', key.trim());
    setUserApiKey(key.trim());
  };

  // Get AI Action Plan from Backend
  const handleFetchAIPlan = async (task: Task) => {
    setActivePlanTask(task);
    setPlanLoading(true);
    setAiPlanResult('');
    setAiPlanError('');
    setCheckedSteps([false, false, false, false, false]);

    try {
      const response = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          taskName: task.name,
          deadline: getTaskRemainingTime(task) || task.deadline || "Today",
          priority: task.priority,
          userApiKey: userApiKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to retrieve AI Plan");
      }

      setAiPlanResult(data.plan);
    } catch (err: any) {
      console.error(err);
      setAiPlanError(err.message || "Couldn't connect to AI. Check your API key in Settings.");
    } finally {
      setPlanLoading(false);
    }
  };

  // Simple parser to extract 5 steps from Gemini numbered list
  const getParsedSteps = (text: string) => {
    if (!text) return [];
    const lines = text.split('\n');
    const steps: string[] = [];
    lines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(/^(?:\d+\.|\-|\*)\s+(.*)$/);
      if (match && match[1]) {
        // Remove trailing or leading bold markups
        steps.push(match[1].replace(/\*\*/g, ''));
      } else if (trimmed && !trimmed.startsWith('#') && trimmed.length > 8 && steps.length < 5) {
        steps.push(trimmed.replace(/\*\*/g, ''));
      }
    });
    return steps.slice(0, 5);
  };

  // Toggle modal task step completion
  const handleToggleStep = (index: number) => {
    setCheckedSteps(prev => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  // Send AI assistant chat message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    const updatedMessages = [...chatMessages, { sender: 'user' as const, text: userMsg }];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          messages: updatedMessages,
          tasks: tasks,
          userApiKey: userApiKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      setChatMessages(prev => [...prev, { sender: 'ai' as const, text: data.reply || "No response received" }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai' as const, text: `⚠️ Error: ${err.message || "Couldn't connect to AI. Check your API key in Settings."}` }]);
      showToast(err.message || "Couldn't connect to AI. Check your API key in Settings.", "error");
    } finally {
      setChatLoading(false);
    }
  };

  // Helper to handle prompt chip clicks and immediately query the AI
  const handlePromptChipClick = async (prompt: string) => {
    if (chatLoading) return;
    setChatInput('');
    const updatedMessages = [...chatMessages, { sender: 'user' as const, text: prompt }];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          messages: updatedMessages,
          tasks: tasks,
          userApiKey: userApiKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      setChatMessages(prev => [...prev, { sender: 'ai' as const, text: data.reply || "No response received" }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai' as const, text: `⚠️ Error: ${err.message || "Couldn't connect to AI. Check your API key in Settings."}` }]);
      showToast(err.message || "Couldn't connect to AI. Check your API key in Settings.", "error");
    } finally {
      setChatLoading(false);
    }
  };

  // Stats calculation
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const urgentCount = tasks.filter(t => t.priority === 'Urgent' && !t.completed).length;
  const productivityPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const yesterdayStr = getYesterdayDateString();
  const yesterdayTasks = tasks.filter(t => t.createdDate && t.createdDate <= yesterdayStr);
  const yesterdayCompletedCount = yesterdayTasks.filter(t => t.completed && (!t.completedAt || t.completedAt <= yesterdayStr)).length;
  const yesterdayTotalCount = yesterdayTasks.length;
  const yesterdayProductivity = yesterdayTotalCount > 0 ? Math.round((yesterdayCompletedCount / yesterdayTotalCount) * 100) : 0;
  const productivityDiff = productivityPercentage - yesterdayProductivity;

  const unreadCount = notifications.filter(n => !n.read).length;

  // Sidebar navigations
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'My Tasks', icon: CheckSquare },
    { name: 'Streak & Badges', icon: Flame },
    { name: 'Schedule', icon: Calendar },
    { name: 'Goals', icon: Target },
  ] as const;

  const toolItems = [
    { name: 'AI Coach', icon: Bot },
    { name: 'AI Assistant', icon: Sparkles },
    { name: 'Reminders', icon: Bell },
    { name: 'Voice Profiles', icon: Mic },
    { name: 'Settings', icon: Settings },
    { name: 'Diagnostics', icon: Activity },
    { name: 'Help', icon: HelpCircle },
  ] as const;



  return (
    <div id="app-root" className="h-screen w-screen flex overflow-hidden bg-custom-bg font-sans text-custom-dark-text selection:bg-custom-sage/20">
      
      {/* CONFETTI OVERLAY */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="fixed pointer-events-none z-50 rounded-sm animate-confetti-fall"
          style={{
            left: `${c.x}%`,
            top: `${c.y}px`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            backgroundColor: c.color,
            opacity: 0.8,
            transform: `rotate(${c.tilt}deg)`,
            '--confetti-delay': `${c.delay}s`,
            '--confetti-duration': `${c.duration}s`,
          } as React.CSSProperties}
        />
      ))}
      
      {/* SIDEBAR BACKDROP (FOR TABLET & MOBILE) */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs transition-opacity duration-300 lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* MOBILE & TABLET SLIDE-OUT DRAWER */}
      <aside 
        id="sidebar-drawer" 
        className={`fixed top-0 left-0 bottom-0 w-[260px] bg-custom-sidebar text-white z-50 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar select-none transition-transform duration-300 ease-in-out shadow-2xl lg:hidden ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-8 relative z-10">
          {/* Logo Area & Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="font-serif font-light text-2xl tracking-tight text-white flex items-center gap-1">
                Kaivora <span className="text-custom-sage font-sans font-medium">✦</span>
              </h1>
              <p className="text-custom-sage font-sans font-bold text-[10px] tracking-widest uppercase mt-0.5">
                AI Productivity Companion
              </p>
            </div>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-custom-soft-text hover:text-white transition-colors cursor-pointer"
              title="Close Navigation Menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav Group 1: MENU */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold tracking-widest text-custom-soft-text/80 uppercase px-3 text-left">
              Menu
            </span>
            <nav className="flex flex-col">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
                    className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-all duration-200 text-left -ml-6 pl-[21px] pr-4 border-l-[3px] rounded-r-lg cursor-pointer ${
                      isActive
                        ? 'text-white bg-white/5 border-l-custom-sage'
                        : 'text-custom-soft-text border-l-transparent hover:text-white hover:bg-white/2'
                    }`}
                  >
                    <IconComponent size={16} className={isActive ? 'text-custom-sage' : 'text-custom-soft-text'} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Nav Group 2: TOOLS */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold tracking-widest text-custom-soft-text/80 uppercase px-3 text-left">
              Tools
            </span>
            <nav className="flex flex-col">
              {toolItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
                    className={`flex items-center gap-3 py-2.5 text-sm font-medium border-l-[3px] -ml-6 pl-[21px] pr-4 rounded-r-lg transition-all duration-200 text-left cursor-pointer ${
                      isActive
                        ? 'text-white bg-white/5 border-l-custom-sage'
                        : 'text-custom-soft-text border-l-transparent hover:text-white hover:bg-white/2'
                    }`}
                  >
                    <IconComponent size={16} className={isActive ? 'text-custom-sage' : 'text-custom-soft-text'} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-4 relative z-10 mt-auto">
          {/* Streak Box */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col gap-2.5 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="text-3xl flex-shrink-0 animate-bounce">🔥</div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-custom-gold leading-none">{streakCount}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-custom-soft-text leading-none">Days</span>
                </div>
                <span className="text-[10px] text-custom-soft-text uppercase font-bold tracking-wider leading-none mt-1">
                  Active Streak
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside id="sidebar" className="w-[240px] h-screen flex-shrink-0 lg:flex hidden flex-col justify-between bg-custom-sidebar text-white relative p-6 overflow-y-auto custom-scrollbar select-none sticky top-0">
        {/* Top Section */}
        <div className="flex flex-col gap-8 relative z-10">
          {/* Logo Area */}
          <div className="flex flex-col">
            <h1 id="sidebar-logo" className="font-serif font-light text-2xl tracking-tight text-white flex items-center gap-1">
              Kaivora <span className="text-custom-sage font-sans font-medium">✦</span>
            </h1>
            <p className="text-custom-sage font-sans font-bold text-[10px] tracking-widest uppercase mt-0.5">
              AI Productivity Companion
            </p>
          </div>

          {/* Nav Group 1: MENU */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold tracking-widest text-custom-soft-text/80 uppercase px-3">
              Menu
            </span>
            <nav className="flex flex-col">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
                    id={`menu-item-${item.name.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-all duration-200 text-left -ml-6 pl-[21px] pr-4 border-l-[3px] rounded-r-lg cursor-pointer ${
                      isActive
                        ? 'text-white bg-white/5 border-l-custom-sage'
                        : 'text-custom-soft-text border-l-transparent hover:text-white hover:bg-white/2'
                    }`}
                  >
                    <IconComponent size={16} className={isActive ? 'text-custom-sage' : 'text-custom-soft-text'} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Nav Group 2: TOOLS */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold tracking-widest text-custom-soft-text/80 uppercase px-3">
              Tools
            </span>
            <nav className="flex flex-col">
              {toolItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
                    id={`tool-item-${item.name.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-3 py-2.5 text-sm font-medium border-l-[3px] -ml-6 pl-[21px] pr-4 rounded-r-lg transition-all duration-200 text-left cursor-pointer ${
                      isActive
                        ? 'text-white bg-white/5 border-l-custom-sage'
                        : 'text-custom-soft-text border-l-transparent hover:text-white hover:bg-white/2'
                    }`}
                  >
                    <IconComponent size={16} className={isActive ? 'text-custom-sage' : 'text-custom-soft-text'} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-4 relative z-10 mt-auto">
          {/* Streak Box */}
          <div id="streak-box" className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col gap-2.5 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="text-3xl flex-shrink-0 animate-bounce">🔥</div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-custom-gold leading-none">{streakCount}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-custom-soft-text leading-none">Days</span>
                  {streakShields > 0 && (
                    <span className="flex items-center gap-0.5 ml-1" title={`${streakShields} Streak Shield(s) active!`}>
                      {Array.from({ length: streakShields }).map((_, i) => (
                        <span key={i} className="text-sm select-none animate-pulse">🛡️</span>
                      ))}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-custom-soft-text uppercase font-bold tracking-wider leading-none mt-1">
                  Active Streak
                </span>
              </div>
            </div>

            {/* Streak Shields Compartment */}
            <div className="border-t border-white/5 pt-2 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase tracking-widest font-bold text-custom-soft-text">Streak Shields</span>
                <span className="text-[9px] font-bold text-custom-gold">{streakShields} / 3</span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => {
                  const isActive = i < streakShields;
                  return (
                    <div 
                      key={i} 
                      className={`h-6 flex-1 rounded-md border flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-[#FAF6EE]/15 border-[#EAD393]/40 text-[#EAD393]' 
                          : 'bg-white/2 border-white/5 text-white/5'
                      }`}
                      title={isActive ? "Streak Shield Active" : "Shield Slot Empty"}
                    >
                      <span className={`text-xs ${isActive ? 'opacity-100' : 'opacity-20 grayscale'}`}>🛡️</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Current Badge Info */}
            <div className="border-t border-white/5 pt-2 flex flex-col">
              <span className="text-[9px] uppercase tracking-widest font-bold text-custom-soft-text">Current Badge</span>
              {(() => {
                const badge = getCurrentBadge();
                return badge ? (
                  <span className="text-xs font-semibold text-white mt-1 flex items-center gap-1.5">
                    <span>{badge.emoji}</span>
                    <span className="truncate">{badge.name}</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-custom-soft-text mt-1 flex items-center gap-1.5">
                    <span>🐣</span>
                    <span>Beginner</span>
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Subtle radial green glow in bottom right corner */}
        <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-custom-sage/15 blur-3xl pointer-events-none" />
      </aside>

      {/* MAIN CONTENT AREA */}
      <main id="main-content" className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-9 pb-24 lg:pb-9 flex flex-col gap-6 relative custom-scrollbar">
        
        {/* TOPBAR */}
        <header id="topbar" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 md:gap-3">
            {/* Hamburger button for Tablet & Mobile drawer toggling */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-white dark:bg-white/5 border border-custom-border dark:border-white/10 text-custom-dark-text dark:text-white transition-colors cursor-pointer hover:bg-custom-card-sec dark:hover:bg-white/10 flex items-center justify-center"
              title="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">
                {formattedDate}
              </span>
              <h2 className="font-serif font-light text-lg sm:text-2xl lg:text-3xl italic text-custom-dark-text mt-0.5">
                Good morning, <span className="text-custom-sage font-medium">Vishvaa 👋</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Pill badge Home Mode (hidden on extra small devices to save valuable layout space) */}
            <div id="home-mode-badge" className="hidden sm:flex bg-white border border-custom-border text-custom-dark-text text-xs font-semibold px-4 py-2 rounded-full shadow-sm items-center gap-1.5 select-none">
              <span>🏠</span> Home Mode
            </div>
            {/* Dark Mode Toggle Button */}
            <button
              id="theme-toggle"
              onClick={toggleDarkMode}
              className={`bg-white border border-custom-border p-2.5 rounded-full hover:bg-custom-card-sec text-custom-dark-text transition-all duration-300 shadow-sm cursor-pointer flex items-center justify-center relative overflow-hidden ${
                isDarkMode ? 'shadow-[0_0_15px_rgba(201,169,110,0.3)] border-[#C9A96E]/50' : ''
              } ${rotateIcon ? 'rotate-[360deg]' : 'rotate-0'}`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{ transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, border-color 0.3s, box-shadow 0.3s' }}
            >
              {isDarkMode ? (
                <Sun size={18} className="text-[#C9A96E]" />
              ) : (
                <Moon size={18} className="text-custom-dark-text" />
              )}
            </button>
            {/* Notification Center dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button 
                id="notification-bell" 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative bg-white border border-custom-border p-2.5 rounded-full hover:bg-custom-card-sec text-custom-dark-text transition-colors shadow-sm cursor-pointer flex items-center justify-center h-10 w-10"
                title="View notification feed"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-custom-rust text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="fixed inset-0 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 w-full sm:w-96 h-screen sm:h-auto bg-white dark:bg-custom-sidebar rounded-none sm:rounded-2xl border-none sm:border border-custom-border dark:border-white/10 shadow-xl z-50 overflow-hidden flex flex-col transition-all duration-300">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-custom-border dark:border-white/5 bg-custom-card-sec/20 dark:bg-white/5 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-custom-dark-text dark:text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-custom-rust/10 text-custom-rust font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] text-custom-sage hover:text-custom-sage/80 font-bold transition-colors cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button 
                          onClick={clearAllNotifications}
                          className="text-[10px] text-custom-rust hover:text-custom-rust/80 font-bold transition-colors cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                      {/* Close button for full-screen mobile view */}
                      <button 
                        onClick={() => setShowNotificationsDropdown(false)}
                        className="sm:hidden p-1.5 rounded-full bg-custom-card-sec dark:bg-white/10 text-custom-dark-text dark:text-white cursor-pointer ml-1"
                        title="Close notifications"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Notification items */}
                  <div className="flex-1 sm:max-h-80 overflow-y-auto divide-y divide-custom-border/50 dark:divide-white/5 custom-scrollbar pb-20 sm:pb-0">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => {
                        let dotColor = "bg-custom-sage";
                        let textColor = "text-custom-dark-text dark:text-white";
                        let bgClass = notif.read ? "bg-white dark:bg-transparent" : "bg-custom-sage/5 dark:bg-white/5";

                        if (notif.type === 'error') {
                          dotColor = "bg-red-500";
                        } else if (notif.type === 'rust') {
                          dotColor = "bg-custom-rust";
                        } else if (notif.type === 'gold') {
                          dotColor = "bg-amber-500";
                        }

                        return (
                          <div 
                            key={notif.id} 
                            className={`p-3.5 hover:bg-custom-card-sec/40 dark:hover:bg-white/5 transition-all flex gap-3 relative ${bgClass}`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                            <div className="flex-1 flex flex-col gap-1 pr-6">
                              <p className={`text-xs leading-normal font-sans text-left ${textColor}`}>
                                {notif.message}
                              </p>
                              <span className="text-[9px] text-custom-soft-text dark:text-custom-soft-text/80 font-mono text-left block">
                                {notif.timestamp}
                              </span>
                            </div>
                            
                            <div className="absolute right-2 top-3 flex items-center gap-1.5">
                              {!notif.read && (
                                <button
                                  onClick={() => toggleReadStatus(notif.id)}
                                  className="text-custom-soft-text hover:text-custom-sage transition-colors p-1 rounded-full hover:bg-custom-card-sec dark:hover:bg-white/10 cursor-pointer"
                                  title="Mark as read"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notif.id)}
                                className="text-custom-soft-text hover:text-custom-rust transition-colors p-1 rounded-full hover:bg-custom-card-sec dark:hover:bg-white/10 cursor-pointer"
                                  title="Delete notification"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">🌿</span>
                        <h4 className="text-xs font-semibold text-custom-dark-text dark:text-white">All Clear</h4>
                        <p className="text-[10px] text-custom-soft-text dark:text-custom-soft-text max-w-[200px]">
                          Your notification center is clear. No past messages.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC VIEW CONTAINER */}
        {activeTab === 'Dashboard' && (
          <>
            {/* STAT CARDS ROW */}
            <section id="stat-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card 1 - Dark */}
              <div id="stat-card-1" className="bg-custom-sidebar text-white rounded-[20px] p-6 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[140px] border border-white/5 group hover:shadow-md transition-all">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">
                    Tasks Today
                  </span>
                  <span className="text-4xl font-bold font-sans tracking-tight mt-1">{totalCount}</span>
                </div>
                <p className="text-xs text-custom-soft-text mt-auto z-10 font-medium">
                  {completedCount} completed so far
                </p>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full border border-white opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              </div>

              {/* Card 2 - Sage Green */}
              <div id="stat-card-2" className="bg-custom-sage text-white rounded-[20px] p-6 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[140px] border border-custom-sage-light/10 group hover:shadow-md transition-all">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                    Urgent Now
                  </span>
                  <span className="text-4xl font-bold font-sans tracking-tight mt-1">{urgentCount}</span>
                </div>
                <p className="text-xs text-white/85 mt-auto z-10 font-medium">
                  Due in less than 24 hrs
                </p>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full border border-white opacity-15 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              </div>

              {/* Card 3 - White */}
              <div id="stat-card-3" className="bg-white text-custom-dark-text rounded-[20px] p-6 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[140px] border border-custom-border group hover:shadow-md transition-all">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">
                    Productivity
                  </span>
                  <span className="text-4xl font-bold font-sans tracking-tight mt-1">{productivityPercentage}%</span>
                </div>
                <p className={`text-xs mt-auto z-10 font-semibold flex items-center gap-1 ${
                  productivityDiff > 0 ? 'text-custom-sage' : productivityDiff < 0 ? 'text-custom-rust' : 'text-custom-soft-text'
                }`}>
                  {productivityDiff > 0 ? `↑ ${productivityDiff}%` : productivityDiff < 0 ? `↓ ${Math.abs(productivityDiff)}%` : `~ 0%`} <span className="text-custom-soft-text font-normal">vs yesterday</span>
                </p>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full border border-custom-dark-text opacity-[0.06] pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              </div>
            </section>

            {/* PROGRESS BAR */}
            <section id="progress-bar-section" className="bg-white rounded-[20px] p-5 border border-custom-border flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs font-bold tracking-wider">
                <span className="text-custom-mid-text uppercase">Today's Progress</span>
                <span className="text-custom-sage uppercase">{completedCount} / {totalCount} tasks done</span>
              </div>
              <div className="h-1.5 bg-custom-border rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-custom-sage to-custom-sage-light h-full rounded-full transition-all duration-500" 
                  style={{ width: `${productivityPercentage}%` }}
                />
              </div>
            </section>

            {/* RESCUE BANNER - Redesigned to Beautiful Peach/Sand Pastel to prevent text cutting */}
            <section id="rescue-banner" className="bg-[#FAF2EE] rounded-[24px] py-8 px-6 sm:py-9 sm:px-8 min-h-[150px] relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#E9D5C8] shadow-sm">
              <div className="flex items-start gap-4 z-10 max-w-full sm:max-w-[75%] flex-1">
                <span className="text-3xl leading-none select-none mt-1">🚨</span>
                <div className="flex flex-col min-h-0 flex-1">
                  <h3 className="font-serif font-light text-2xl text-[#8E4123] leading-snug py-0.5">
                    Feeling <span className="text-custom-rust italic font-medium">overwhelmed?</span>
                  </h3>
                  <p className="text-[#735A4F] text-sm mt-1.5 leading-relaxed font-sans font-medium whitespace-normal break-words">
                    Activate Rescue Mode to dynamically re-schedule your day, silence noise, and break complex objectives down into simple 5-minute micro-steps.
                  </p>
                </div>
              </div>
              <button 
                id="rescue-button" 
                onClick={handleTriggerRescueMode}
                className="bg-[#C06B4A] hover:bg-[#A95939] text-white font-medium text-sm px-6 py-3.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 hover:scale-[1.02] active:scale-95 z-10 flex-shrink-0 cursor-pointer self-stretch sm:self-auto justify-center"
              >
                🚀 Rescue Me!
              </button>
              
              {/* Subtle rust radial glow in top right corner */}
              <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-custom-rust/10 blur-3xl pointer-events-none" />
            </section>

            {/* TWO COLUMN DASHBOARD LAYOUT */}
            <div id="dashboard-columns" className="grid grid-cols-1 xl:grid-cols-[1fr_380px] lg:grid-cols-[1fr_320px] gap-6 items-start">
              
              {/* LEFT COLUMN - TASKS */}
              <div id="left-column" className="flex flex-col gap-6">
                
                {/* Task Input Card */}
                <form onSubmit={handleAddTask} id="task-input-form" className="bg-white rounded-[20px] p-3 border border-custom-border flex flex-col md:flex-row items-center gap-3 shadow-sm hover:border-custom-border/80 transition-all w-full">
                  <div className="flex items-center gap-3 flex-1 w-full">
                    <button
                      type="button"
                      id="voice-input-btn"
                      onClick={startSpeechRecognition}
                      className={`relative p-2.5 rounded-full transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${
                        isListening
                          ? 'bg-custom-rust text-white ring-4 ring-custom-rust/30'
                          : 'bg-custom-sage-light/20 text-custom-sage hover:bg-custom-sage-light/30'
                      }`}
                      title={isListening ? "Listening... Speak now" : "Click to use voice typing"}
                    >
                      {isListening && (
                        <span className="absolute inset-0 rounded-full bg-custom-rust/40 animate-ping" />
                      )}
                      <Mic size={18} className="relative z-10" />
                    </button>
                    <input
                      type="text"
                      ref={inputRef}
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      placeholder="Type a task or tap 🎤 to speak..."
                      className="bg-transparent border-none outline-none flex-1 text-custom-dark-text placeholder:text-custom-soft-text text-sm min-w-0"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-shrink-0">
                    {/* Small Deadline Date Picker */}
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="bg-custom-card-sec/50 hover:bg-custom-card-sec border border-custom-border/60 rounded-xl px-2.5 py-1.5 text-xs text-custom-mid-text font-medium outline-none cursor-pointer transition-all"
                      title="Set deadline date"
                    />

                    {/* Small Deadline Time Picker */}
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="bg-custom-card-sec/50 hover:bg-custom-card-sec border border-custom-border/60 rounded-xl px-2.5 py-1.5 text-xs text-custom-mid-text font-medium outline-none cursor-pointer transition-all"
                      title="Set deadline time"
                    />

                    {/* Priority Selector */}
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="bg-custom-card-sec/50 hover:bg-custom-card-sec border border-custom-border/60 rounded-xl px-2.5 py-1.5 text-xs text-custom-mid-text font-semibold outline-none cursor-pointer transition-all"
                      title="Select Priority"
                    >
                      <option value="Urgent">🔴 Urgent</option>
                      <option value="High">🟢 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">⚪ Low</option>
                    </select>

                    {/* Voice Profile Selector */}
                    <select
                      value={selectedVoiceProfileId}
                      onChange={(e) => setSelectedVoiceProfileId(e.target.value)}
                      className="bg-custom-card-sec/50 hover:bg-custom-card-sec border border-custom-border/60 rounded-xl px-2.5 py-1.5 text-xs text-custom-mid-text font-semibold outline-none cursor-pointer transition-all"
                      title="Select Voice Profile Reminder"
                    >
                      <option value="">🗣️ System Voice</option>
                      {voiceProfiles.map(p => (
                        <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      id="add-task-btn"
                      className="bg-custom-sidebar hover:bg-custom-sidebar/90 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </form>

                {/* Section Header */}
                <div className="flex justify-between items-center mt-1 px-1">
                  <span className="text-[10px] font-bold tracking-widest text-custom-mid-text uppercase">
                    Today's Tasks
                  </span>
                  <button 
                    onClick={() => setActiveTab('My Tasks')}
                    className="text-custom-sage hover:text-custom-sage-light text-xs font-bold tracking-wider uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    View all →
                  </button>
                </div>

                {/* Tasks List */}
                <div id="tasks-list" className="flex flex-col gap-3">
                  {tasks.map((task) => {
                    let borderClass = 'border-l-custom-soft-text/40';
                    let badgeBg = 'bg-custom-soft-text/10 text-custom-soft-text';
                    
                    if (task.priority === 'Urgent') {
                      borderClass = 'border-l-custom-rust';
                      badgeBg = 'bg-custom-rust-light/25 text-custom-rust';
                    } else if (task.priority === 'High') {
                      borderClass = 'border-l-custom-sage';
                      badgeBg = 'bg-custom-sage-light/25 text-custom-sage';
                    } else if (task.priority === 'Medium') {
                      borderClass = 'border-l-custom-gold';
                      badgeBg = 'bg-custom-gold/15 text-custom-gold';
                    }

                    const assignedProfile = voiceProfiles.find(p => p.id === task.voiceProfileId);

                    return (
                      <div 
                        key={task.id} 
                        id={`task-card-${task.id}`} 
                        onClick={() => toggleTaskCompletion(task.id)}
                        className={`bg-white rounded-2xl border border-custom-border border-l-[3px] ${borderClass} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                          task.completed ? 'opacity-60 bg-custom-card-sec/30' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1 w-full">
                          {/* Circle Checkmark indicator */}
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-all flex-shrink-0 ${
                            task.completed 
                              ? 'bg-custom-sage border-custom-sage text-white' 
                              : 'border-custom-border hover:border-custom-sage hover:bg-custom-sage-light/10'
                          }`}>
                            {task.completed && <Check size={11} strokeWidth={3} />}
                          </div>
                          
                          <div className="flex flex-col gap-1 min-w-0 flex-1 pr-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-medium text-custom-dark-text text-sm truncate ${task.completed ? 'line-through text-custom-soft-text' : ''}`}>
                                {task.name}
                              </h4>
                              <span className={`${badgeBg} text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full`}>
                                {task.priority}
                              </span>
                              {assignedProfile && (
                                <span className="inline-flex items-center gap-1 bg-[#FAF2EE] text-[#C06B4A] border border-[#E9D5C8]/80 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                                  🎙️ {assignedProfile.emoji} {assignedProfile.name}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-custom-soft-text flex items-center gap-1">
                              <span>{task.completed ? '✅' : '⏰'}</span> {getTaskRemainingTime(task)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pl-8 sm:pl-0 mt-1 sm:mt-0 flex-wrap">
                          {!task.completed && (
                            <>
                              {assignedProfile && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTestVoice(task, assignedProfile);
                                  }}
                                  className="bg-[#FAF2EE] text-[#C06B4A] hover:bg-[#FAF2EE]/80 border border-[#E9D5C8] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                                  title={`Test ${assignedProfile.name} Voice`}
                                >
                                  🔊 Test
                                </button>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFetchAIPlan(task);
                                }}
                                className="border border-custom-sage/30 text-custom-sage hover:bg-custom-sage/5 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                              >
                                AI Plan <span className="text-[10px]">✨</span>
                              </button>

                              {/* Voice reminder dropdown selector */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenVoiceDropdownTaskId(openVoiceDropdownTaskId === task.id ? null : task.id);
                                  }}
                                  className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                                    task.voiceProfileId 
                                      ? 'bg-[#FAF2EE] text-[#C06B4A] border-[#E9D5C8]' 
                                      : 'border-custom-border/60 text-custom-soft-text hover:text-[#C06B4A] hover:bg-custom-rust-light/10'
                                  }`}
                                  title="Assign Voice Profile Reminder"
                                >
                                  <Mic size={14} />
                                </button>
                                
                                {openVoiceDropdownTaskId === task.id && (
                                  <div 
                                    className="absolute right-0 mt-2 w-48 bg-white border border-custom-border rounded-xl shadow-xl z-50 py-1.5 animate-scale-up"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-3 py-1 text-[10px] font-bold text-custom-soft-text uppercase tracking-widest border-b border-custom-border/50 mb-1">
                                      Assign Voice Profile
                                    </div>
                                    {voiceProfiles.map((profile) => (
                                      <button
                                        key={profile.id}
                                        onClick={() => {
                                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, voiceProfileId: profile.id } : t));
                                          setOpenVoiceDropdownTaskId(null);
                                          showToast(`Assigned ${profile.emoji} ${profile.name} voice reminder to "${task.name}"`, "success");
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs text-custom-dark-text hover:bg-custom-card-sec/70 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                      >
                                        <span>{profile.emoji}</span>
                                        <span className="flex-1">{profile.name}</span>
                                        {task.voiceProfileId === profile.id && <Check size={12} className="text-custom-sage" />}
                                      </button>
                                    ))}
                                    {task.voiceProfileId && (
                                      <button
                                        onClick={() => {
                                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, voiceProfileId: undefined } : t));
                                          setOpenVoiceDropdownTaskId(null);
                                          showToast(`Cleared voice assignment for "${task.name}"`, "info");
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs text-[#C06B4A] hover:bg-custom-rust-light/10 border-t border-custom-border/50 mt-1 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
                                      >
                                        <span>❌</span>
                                        <span>Clear Assignment</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                          <button
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className="p-1.5 text-custom-soft-text hover:text-custom-rust hover:bg-custom-rust-light/10 rounded-lg transition-all cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {tasks.length === 0 && (
                    <div className="text-center p-8 bg-white rounded-2xl border border-custom-border border-dashed">
                      <p className="text-custom-soft-text text-sm">No tasks remaining for today. Type a task above to get started!</p>
                    </div>
                  )}
                </div>

                {/* MY BADGES SECTION */}
                <section id="my-badges-section" className="bg-white rounded-[20px] p-6 border border-custom-border shadow-sm flex flex-col gap-5 mt-2">
                  <div className="flex justify-between items-center border-b border-custom-border/50 pb-3">
                    <div>
                      <h3 className="font-serif font-light text-xl text-custom-dark-text">My Badges</h3>
                      <p className="text-custom-soft-text text-xs mt-0.5">Your milestones of legendary focus and consistency.</p>
                    </div>
                    <div className="bg-[#FAF6EE] border border-[#EAD393] px-3 py-1.5 rounded-full shadow-xs flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#8C6B16]">{Object.keys(earnedBadges).length} / 10 Badges Earned</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {BADGES.map((badge) => {
                      const isEarned = !!earnedBadges[badge.id];
                      const dateEarned = earnedBadges[badge.id];
                      const daysToGo = badge.days - streakCount;

                      if (isEarned) {
                        return (
                          <div 
                            key={badge.id}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-[#C9A96E]/50 shadow-[0_0_12px_rgba(201,169,110,0.15)] bg-gradient-to-b from-white to-[#FCFBF8] text-center transition-all hover:scale-[1.03] duration-300 min-h-[145px]"
                          >
                            <span className="text-3xl select-none mb-1.5">{badge.emoji}</span>
                            <span className="font-bold text-xs text-custom-dark-text tracking-tight">{badge.name}</span>
                            <p className="font-serif italic text-[10px] text-custom-mid-text leading-tight mt-1 px-1">
                              "{badge.quote}"
                            </p>
                            <span className="text-[9px] text-[#8C6B16] mt-2.5 font-bold uppercase tracking-wider bg-[#FAF6EE] px-1.5 py-0.5 rounded-md">
                              Earned {dateEarned}
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div 
                            key={badge.id}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border border-custom-border bg-[#FAFAF9] text-center opacity-55 hover:opacity-75 transition-all duration-300 min-h-[145px]"
                          >
                            <div className="relative mb-1.5">
                              <span className="text-3xl grayscale select-none filter blur-[0.5px]">{badge.emoji}</span>
                              <span className="absolute -bottom-1.5 -right-1.5 bg-custom-mid-text text-white p-0.5 rounded-full text-[9px]" title="Locked">
                                🔒
                              </span>
                            </div>
                            <span className="font-bold text-xs text-custom-soft-text tracking-tight">{badge.name}</span>
                            <span className="text-[9px] text-custom-soft-text mt-2 font-medium tracking-wide bg-custom-card-sec/60 px-1.5 py-0.5 rounded-md">
                              {daysToGo > 0 ? `${daysToGo} days to go` : "Unlock next!"}
                            </span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN - COLLAPSIBLE MULTI-TAB AI ADVISOR */}
              <div id="right-column" className="flex flex-col gap-5 w-full lg:w-[320px] xl:w-[380px] flex-shrink-0 transition-all duration-350">
                
                {/* Collapsed view toggle card */}
                {isRightColumnCollapsed ? (
                  <button 
                    onClick={() => setIsRightColumnCollapsed(false)}
                    className="bg-white rounded-[20px] p-4.5 border border-custom-border shadow-xs hover:shadow-sm transition-all flex items-center justify-between w-full cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-custom-sage/10 text-custom-sage flex items-center justify-center">
                        <Bot size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-custom-soft-text uppercase tracking-wider block">AI Daily Coach</span>
                        <span className="text-xs font-bold text-custom-dark-text mt-0.5 block group-hover:text-custom-sage transition-colors">Expand Daily Advisor</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-custom-soft-text group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <div className="bg-white rounded-[24px] border border-custom-border shadow-sm flex flex-col gap-4 overflow-hidden animate-scale-up">
                    
                    {/* Header block with collapse action */}
                    <div className="px-5 pt-5 pb-2.5 flex items-center justify-between border-b border-custom-border/60">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-custom-sage animate-ping" />
                        <span className="text-[10px] font-extrabold tracking-widest text-custom-mid-text uppercase">
                          Kaivora AI Advisor
                        </span>
                      </div>
                      <button 
                        onClick={() => setIsRightColumnCollapsed(true)}
                        className="text-[10px] font-bold text-custom-soft-text hover:text-custom-rust transition-colors flex items-center gap-0.5 cursor-pointer border-none bg-transparent"
                        title="Collapse advisor panel"
                      >
                        Collapse ✕
                      </button>
                    </div>

                    {/* Horizontal tabs inside advisor panel */}
                    <div className="px-5 flex gap-1.5 border-b border-custom-border/40 pb-3">
                      {[
                        { id: 'coach' as const, label: 'Coach', icon: Bot },
                        { id: 'schedule' as const, label: 'Schedule', icon: Calendar },
                        { id: 'chat' as const, label: 'Live Chat', icon: Sparkles }
                      ].map(t => {
                        const Icon = t.icon;
                        const isSel = rightColumnTab === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setRightColumnTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSel 
                                ? 'bg-custom-sidebar text-white shadow-xs' 
                                : 'text-custom-soft-text hover:bg-custom-card-sec/15 hover:text-custom-dark-text border-none'
                            }`}
                          >
                            <Icon size={13} />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab contents */}
                    <div className="px-5 pb-5">
                      {rightColumnTab === 'coach' && (
                        <AICoachPage
                          tasks={tasks}
                          setTasks={setTasks}
                          activeTab={activeTab}
                          setActiveTab={setActiveTab}
                          userApiKey={userApiKey}
                          isDarkMode={isDarkMode}
                          compact={true}
                          streakCount={streakCount}
                          longestStreak={longestStreak}
                        />
                      )}

                      {rightColumnTab === 'schedule' && (
                        <div className="flex flex-col gap-4">
                          {/* Generate Button at top of AI Schedule panel */}
                          <button
                            type="button"
                            onClick={handleGenerateSchedule}
                            disabled={scheduleLoading}
                            className="w-full bg-[#FAF2EE] hover:bg-[#FAF2EE]/80 border border-[#E9D5C8] text-[#C06B4A] py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {scheduleLoading ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-[#C06B4A] border-t-transparent rounded-full animate-spin" />
                                <span>Generating Schedule...</span>
                              </>
                            ) : (
                              <>
                                <span>✨</span> Generate Schedule with Kaivora
                              </>
                            )}
                          </button>

                          {/* Error state if any */}
                          {scheduleError && (
                            <p className="text-[11px] text-custom-rust font-medium leading-relaxed bg-custom-rust-light/5 border border-custom-rust-light/20 rounded-lg p-2.5">
                              ⚠️ {scheduleError}
                            </p>
                          )}

                          {/* Schedule list / loading state / empty state */}
                          <div className="flex flex-col">
                            {scheduleLoading ? (
                              <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="w-8 h-8 border-3 border-[#C06B4A] border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs text-custom-soft-text font-medium">Kaivora is planning your day...</span>
                              </div>
                            ) : tasks.length === 0 ? (
                              <div className="text-center py-8 px-4 bg-custom-card-sec/10 rounded-xl border border-dashed border-custom-border/80">
                                <p className="text-[#C06B4A] text-xs leading-relaxed font-semibold">Add some tasks first to generate your schedule!</p>
                              </div>
                            ) : (
                              <div className="flex flex-col divide-y divide-custom-border/60 max-h-[350px] overflow-y-auto pr-1">
                                {scheduleItems.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                                    <span className="text-xs font-bold text-custom-dark-text w-[75px] flex-shrink-0">
                                      {item.time}
                                    </span>
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.dotColor}`} />
                                      <span className="text-xs font-medium text-custom-dark-text truncate">
                                        {item.name}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-custom-soft-text font-medium flex-shrink-0">
                                      {item.duration}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {rightColumnTab === 'chat' && (
                        <div className="flex flex-col gap-4">
                          {/* Chat logs */}
                          <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                            {chatMessages.map((msg, i) => (
                              <div 
                                key={i} 
                                className={`p-3 text-xs leading-relaxed border relative ${
                                  msg.sender === 'ai' 
                                    ? 'bg-white rounded-2xl rounded-tl-sm border-custom-border/40 text-custom-mid-text' 
                                    : 'bg-custom-sage/10 rounded-2xl rounded-tr-sm border-custom-sage/20 text-[#2B4C3A] self-end max-w-[85%]'
                                }`}
                              >
                                <p>{msg.text}</p>
                              </div>
                            ))}
                            
                            {/* Bouncing 3-dot typing animation */}
                            {chatLoading && (
                              <div className="p-3 text-xs leading-relaxed border bg-white rounded-2xl rounded-tl-sm border-custom-border/40 text-custom-soft-text self-start flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-custom-mid-text/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-custom-mid-text/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-custom-mid-text/60 rounded-full animate-bounce"></span>
                              </div>
                            )}
                            <div ref={chatEndRef} />
                          </div>

                          {/* Chat Input */}
                          <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 border border-custom-border rounded-xl p-1.5 pl-3.5 bg-custom-card-sec/30">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Ask anything to Kaivora..."
                              className="bg-transparent border-none outline-none flex-1 text-xs text-custom-dark-text placeholder:text-custom-soft-text min-w-0"
                            />
                            <button type="submit" className="bg-custom-sage hover:bg-custom-sage/95 text-white p-2 rounded-lg font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center flex-shrink-0 cursor-pointer">
                              <ArrowRight size={14} strokeWidth={2.5} />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

            </div>
          </>
        )}

        {/* MY TASKS TAB VIEW */}
        {activeTab === 'My Tasks' && (
          <div className="bg-white rounded-[20px] p-6 border border-custom-border shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif font-light text-2xl text-custom-dark-text">My Task Manager</h3>
                <p className="text-custom-soft-text text-sm">Full index of tasks, priorities, and deadline compliance trackers.</p>
              </div>
              <button 
                onClick={() => {
                  setTasks(defaultTasks);
                  showToast("Reset to default task parameters", "info");
                }}
                className="text-xs bg-custom-card-sec hover:bg-custom-border text-custom-mid-text px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Reset Tasks
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-custom-card-sec/40 p-4 rounded-xl border border-custom-border/60 text-center">
              <div>
                <span className="text-xs text-custom-soft-text block">Total Objectives</span>
                <span className="text-2xl font-bold text-custom-dark-text mt-1 block">{tasks.length}</span>
              </div>
              <div>
                <span className="text-xs text-custom-soft-text block">Pending Actions</span>
                <span className="text-2xl font-bold text-custom-rust mt-1 block">{tasks.filter(t => !t.completed).length}</span>
              </div>
              <div>
                <span className="text-xs text-custom-soft-text block">Completed Loops</span>
                <span className="text-2xl font-bold text-custom-sage mt-1 block">{tasks.filter(t => t.completed).length}</span>
              </div>
              <div>
                <span className="text-xs text-custom-soft-text block">Compliance Ratio</span>
                <span className="text-2xl font-bold text-custom-gold mt-1 block">{productivityPercentage}%</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {tasks.map(task => {
                const assignedProfile = voiceProfiles.find(p => p.id === task.voiceProfileId);

                return (
                  <div key={task.id} className="flex flex-col sm:flex-row justify-between sm:items-center border border-custom-border p-4 rounded-xl bg-custom-card-sec/10 hover:bg-custom-card-sec/20 transition-all gap-3.5">
                    <div className="flex items-start gap-3 min-w-0 flex-1 w-full">
                      <input 
                        type="checkbox" 
                        checked={task.completed} 
                        onChange={() => toggleTaskCompletion(task.id)}
                        className="w-4 h-4 rounded border-custom-border text-custom-sage focus:ring-custom-sage cursor-pointer mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${task.completed ? 'line-through text-custom-soft-text' : 'text-custom-dark-text'}`}>{task.name}</span>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-custom-soft-text">({task.priority})</span>
                          {assignedProfile && (
                            <span className="inline-flex items-center gap-1 bg-custom-rust-light/10 text-[#C06B4A] border border-[#E9D5C8]/80 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                              {assignedProfile.emoji} {assignedProfile.name}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-custom-soft-text block mt-0.5">Deadline: {task.deadline}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end pl-7 sm:pl-0 mt-1 sm:mt-0 flex-wrap">
                      {!task.completed && assignedProfile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(task, assignedProfile);
                          }}
                          className="bg-[#FAF2EE] text-[#C06B4A] hover:bg-[#FAF2EE]/80 border border-[#E9D5C8] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                          title={`Test ${assignedProfile.name} Voice`}
                        >
                          🔊 Test
                        </button>
                      )}
                      
                      {/* Voice reminder dropdown selector */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenVoiceDropdownTaskId(openVoiceDropdownTaskId === task.id ? null : task.id);
                          }}
                          className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                            task.voiceProfileId 
                              ? 'bg-[#FAF2EE] text-[#C06B4A] border-[#E9D5C8]' 
                              : 'border-custom-border/60 text-custom-soft-text hover:text-[#C06B4A] hover:bg-custom-rust-light/10'
                          }`}
                          title="Assign Voice Profile Reminder"
                        >
                          <Mic size={14} />
                        </button>
                        
                        {openVoiceDropdownTaskId === task.id && (
                          <div 
                            className="absolute right-0 mt-2 w-48 bg-white border border-custom-border rounded-xl shadow-xl z-50 py-1.5 animate-scale-up"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3 py-1 text-[10px] font-bold text-custom-soft-text uppercase tracking-widest border-b border-custom-border/50 mb-1">
                              Assign Voice Profile
                            </div>
                            {voiceProfiles.map((profile) => (
                              <button
                                key={profile.id}
                                onClick={() => {
                                  setTasks(prev => prev.map(t => t.id === task.id ? { ...t, voiceProfileId: profile.id } : t));
                                  setOpenVoiceDropdownTaskId(null);
                                  showToast(`Assigned ${profile.emoji} ${profile.name} voice reminder to "${task.name}"`, "success");
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs text-custom-dark-text hover:bg-custom-card-sec/70 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                              >
                                <span>{profile.emoji}</span>
                                <span className="flex-1">{profile.name}</span>
                                {task.voiceProfileId === profile.id && <Check size={12} className="text-custom-sage" />}
                              </button>
                            ))}
                            {task.voiceProfileId && (
                              <button
                                onClick={() => {
                                  setTasks(prev => prev.map(t => t.id === task.id ? { ...t, voiceProfileId: undefined } : t));
                                  setOpenVoiceDropdownTaskId(null);
                                  showToast(`Cleared voice assignment for "${task.name}"`, "info");
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs text-[#C06B4A] hover:bg-custom-rust-light/10 border-t border-custom-border/50 mt-1 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
                              >
                                <span>❌</span>
                                <span>Clear Assignment</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="text-custom-rust hover:bg-custom-rust-light/10 p-2 rounded-lg transition-all cursor-pointer text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'Streak & Badges' && (
          <div className="flex flex-col gap-6 animate-scale-up">
            {(() => {
              let goalsList: any[] = [];
              try {
                goalsList = JSON.parse(localStorage.getItem('kaivora_arena_goals') || '[]');
              } catch (e) {
                goalsList = [];
              }
              const totalBadgesEarned = Object.keys(earnedBadges).length;
              const totalAchPoints = Object.keys(earnedBadges).reduce((sum, id) => {
                const isAch = ACHIEVEMENT_BADGES.some(a => a.id === id);
                return sum + (isAch ? 250 : 100);
              }, 0) + taskXP;
              const completionPct = Math.min(100, Math.round((totalBadgesEarned / 25) * 100));

              // Determine Rank
              let currentRank = "Novice Sentinel";
              if (totalBadgesEarned >= 25) currentRank = "Kaivora Supreme";
              else if (totalBadgesEarned >= 20) currentRank = "Grandmaster Architect";
              else if (totalBadgesEarned >= 15) currentRank = "Momentum Titan";
              else if (totalBadgesEarned >= 10) currentRank = "Focus Sovereign";
              else if (totalBadgesEarned >= 6) currentRank = "Habit Commander";
              else if (totalBadgesEarned >= 3) currentRank = "Discipline Pioneer";

              // Rarest Badge Earned
              const rarestBadge = BADGES.slice().reverse().find(b => earnedBadges[b.id])?.name || "None Yet";

              // Next Badge to Unlock
              const nextStreakBadge = [...BADGES].sort((a,b) => a.days - b.days).find(b => !earnedBadges[b.id]);

              return (
                <>
                  {/* GAMIFICATION OVERVIEW DASHBOARD */}
                  <div className="bg-white rounded-[28px] border border-custom-border p-6 shadow-sm">
                    <div className="flex flex-col gap-1.5 mb-5 text-left">
                      <span className="text-[10px] font-bold tracking-widest text-custom-gold uppercase flex items-center gap-1">
                        <span>🏆</span> Gamification Command
                      </span>
                      <h3 className="font-serif font-light text-2xl text-custom-dark-text">Your Badge Dashboard</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                      {/* STAT 1: Badges Earned */}
                      <div className="bg-[#FAF6EE]/40 border border-custom-border/60 rounded-2xl p-4 flex flex-col justify-between text-left">
                        <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Earned</span>
                        <div className="my-2 flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-custom-dark-text">{totalBadgesEarned}</span>
                          <span className="text-xs text-custom-soft-text">/ 25</span>
                        </div>
                        <span className="text-[10px] text-custom-gold font-semibold">Total Badges</span>
                      </div>

                      {/* STAT 2: Achievement Points */}
                      <div className="bg-gradient-to-b from-white to-[#FCFBF8] border border-custom-border rounded-2xl p-4 flex flex-col justify-between text-left">
                        <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Score</span>
                        <div className="my-2 flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-[#8C6B16]">{totalAchPoints}</span>
                          <span className="text-xs text-custom-soft-text">PTS</span>
                        </div>
                        <span className="text-[10px] text-[#8C6B16] font-semibold">
                          Gamification XP <span className="text-[9px] font-normal text-custom-soft-text">({taskXP} from Tasks)</span>
                        </span>
                      </div>

                      {/* STAT 3: Completion % */}
                      <div className="bg-gradient-to-b from-white to-[#FCFBF8] border border-custom-border rounded-2xl p-4 flex flex-col justify-between text-left">
                        <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Progress</span>
                        <div className="my-2 flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-custom-dark-text">{completionPct}%</span>
                        </div>
                        <div className="w-full h-1 bg-custom-card-sec rounded-full overflow-hidden">
                          <div className="h-full bg-custom-gold rounded-full" style={{ width: `${completionPct}%` }} />
                        </div>
                      </div>

                      {/* STAT 4: Current Rank */}
                      <div className="bg-[#FAF6EE]/30 border border-custom-border/60 rounded-2xl p-4 flex flex-col justify-between text-left">
                        <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Rank</span>
                        <div className="my-2">
                          <span className="text-sm font-bold text-custom-dark-text block truncate" title={currentRank}>{currentRank}</span>
                        </div>
                        <span className="text-[10px] text-custom-gold font-semibold">Honor Tier</span>
                      </div>

                      {/* STAT 5: Next Badge */}
                      <div className="bg-gradient-to-b from-white to-[#FCFBF8] border border-custom-border rounded-2xl p-4 flex flex-col justify-between text-left">
                        <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Next up</span>
                        <div className="my-2 flex items-center gap-1.5 truncate">
                          <span className="text-xl">{nextStreakBadge?.emoji || '🌌'}</span>
                          <span className="text-xs font-semibold text-custom-dark-text truncate">{nextStreakBadge?.name || 'All Unlocked'}</span>
                        </div>
                        <span className="text-[10px] text-custom-soft-text font-semibold">{nextStreakBadge ? `${nextStreakBadge.days} Days` : 'Legendary'}</span>
                      </div>

                      {/* STAT 6: Rarest Badge */}
                      <div className="bg-gradient-to-b from-white to-[#FCFBF8] border border-custom-border rounded-2xl p-4 flex flex-col justify-between text-left">
                        <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Rarest</span>
                        <div className="my-2">
                          <span className="text-xs font-bold text-custom-dark-text block truncate">{rarestBadge}</span>
                        </div>
                        <span className="text-[10px] text-[#8C6B16] font-semibold">In Hall of Wins</span>
                      </div>

                      {/* STAT 7: Longest Streak */}
                      <div className="bg-[#FAF6EE]/40 border border-custom-border/60 rounded-2xl p-4 flex flex-col justify-between text-left">
                        <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Peak</span>
                        <div className="my-2 flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-[#8C6B16]">{longestStreak}</span>
                          <span className="text-xs text-custom-soft-text">DAYS</span>
                        </div>
                        <span className="text-[10px] text-[#8C6B16] font-semibold">Lifetime Best</span>
                      </div>
                    </div>
                  </div>

                  {/* Top row with streak status & shields */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                    {/* Left Side: Massive Streak Info (7 cols) */}
                    <div className="lg:col-span-7 bg-white rounded-[24px] p-8 border border-custom-border shadow-sm flex flex-col justify-between relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-custom-gold/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex flex-col gap-1.5 relative z-10">
                        <span className="text-[10px] font-bold tracking-widest text-custom-gold uppercase flex items-center gap-1">
                          <span>🔥</span> Momentum Engine
                        </span>
                        <h3 className="font-serif font-light text-2xl text-custom-dark-text">Your Daily Streak</h3>
                        <p className="text-custom-soft-text text-sm max-w-md mt-0.5">
                          Consistency builds compound habits. Complete at least one task every day to power your momentum.
                        </p>
                      </div>

                      <div className="flex items-center gap-6 my-6 relative z-10">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/10 to-custom-gold/25 flex items-center justify-center border border-custom-gold/30 shadow-[0_0_30px_rgba(234,211,147,0.3)] animate-pulse">
                          <span className="text-5xl">🔥</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-6xl font-bold font-sans text-custom-dark-text tracking-tight leading-none">{streakCount}</span>
                            <span className="text-sm font-bold tracking-widest uppercase text-custom-gold">Days</span>
                          </div>
                          <span className="text-xs font-semibold text-custom-soft-text mt-1.5">
                            Current consecutive day streak
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-custom-border/60 pt-5 flex flex-col gap-3 mt-auto relative z-10">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-custom-mid-text font-medium">Current Milestone Rank:</span>
                          {(() => {
                            const badge = getCurrentBadge();
                            return (
                              <span className="font-bold text-[#8C6B16] bg-[#FAF6EE] border border-[#EAD393]/40 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                <span>{badge ? badge.emoji : '🐣'}</span>
                                <span>{badge ? badge.name : 'Beginner'}</span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Progress tracker to the next milestone */}
                        {(() => {
                          const sorted = [...BADGES].sort((a, b) => a.days - b.days);
                          const nextBadge = sorted.find(b => streakCount < b.days);
                          if (!nextBadge) {
                            return (
                              <p className="text-xs text-custom-sage font-bold flex items-center gap-1">
                                ✨ You have achieved the highest rank of Eternal Legend! 🌌
                              </p>
                            );
                          }
                          const prevMilestoneDays = sorted.slice().reverse().find(b => streakCount >= b.days)?.days || 0;
                          const range = nextBadge.days - prevMilestoneDays;
                          const progressInThisMilestone = streakCount - prevMilestoneDays;
                          const pct = Math.min(100, Math.max(0, Math.round((progressInThisMilestone / range) * 100)));

                          return (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-[11px] text-custom-soft-text">
                                <span>Next Badge: <strong>{nextBadge.emoji} {nextBadge.name}</strong> ({nextBadge.days} days)</span>
                                <span>{nextBadge.days - streakCount} days remaining</span>
                              </div>
                              <div className="w-full h-2 bg-custom-card-sec rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#C9A96E] to-amber-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right Side: Shields Compartment (5 cols) */}
                    <div className="lg:col-span-5 bg-white rounded-[24px] p-8 border border-custom-border shadow-sm flex flex-col justify-between relative overflow-hidden group">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold tracking-widest text-[#4A86E8] uppercase flex items-center gap-1">
                          <span>🛡️</span> Shield Chamber
                        </span>
                        <h3 className="font-serif font-light text-2xl text-custom-dark-text">Streak Shields</h3>
                        <p className="text-custom-soft-text text-xs leading-relaxed mt-0.5">
                          Life happens. Streak shields act as holiday protection—automatically consumed when you miss a day so your momentum doesn't break!
                        </p>
                      </div>

                      <div className="my-6">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-custom-mid-text">Active Protection Slots</span>
                          <span className="text-xs font-bold text-[#8C6B16] bg-[#FAF6EE] px-2.5 py-0.5 rounded-full border border-[#EAD393]/30">
                            {streakShields} / 3 Occupied
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {Array.from({ length: 3 }).map((_, i) => {
                            const isActive = i < streakShields;
                            return (
                              <div 
                                key={i} 
                                className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-500 ${
                                  isActive 
                                    ? 'bg-gradient-to-b from-[#FAF6EE]/50 to-[#FAF6EE] border-[#EAD393] text-[#8C6B16] shadow-[0_4px_12px_rgba(201,169,110,0.15)] scale-[1.02]' 
                                    : 'bg-[#FAFAF9] border-dashed border-custom-border text-custom-soft-text/40'
                                }`}
                              >
                                <span className={`text-3xl transition-transform duration-500 ${isActive ? 'scale-110' : 'grayscale opacity-20'}`}>🛡️</span>
                                <span className="text-[10px] font-bold mt-2 uppercase tracking-wider">
                                  {isActive ? `Slot ${i+1}` : "Empty"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-custom-border/60 pt-4 flex flex-col gap-2 bg-[#FAFAF9] -mx-8 -mb-8 p-6">
                        <h4 className="text-[10px] font-extrabold tracking-wider text-custom-mid-text uppercase">How to recharge shields:</h4>
                        <ul className="text-xs text-custom-soft-text flex flex-col gap-1.5 list-disc pl-4 leading-relaxed">
                          <li>
                            <strong>Complete 1 Urgent Task</strong>: Awards <strong>+1 Streak Shield</strong> instantly.
                          </li>
                          <li>
                            <strong>Complete 3 High-Priority Tasks</strong> in one single day: Awards <strong>+1 Streak Shield</strong>.
                          </li>
                          <li>
                            <strong>Daily Cap</strong>: You can earn a <strong>maximum of 1 streak shield per day</strong>, even if you complete multiple qualifying tasks.
                          </li>
                          <li>
                            Streak shields are maxed at 3. They activate automatically on missed days (1 shield per 1 day of protection).
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* STREAK BADGES: Hall of Legends */}
                  <div className="bg-white rounded-[24px] p-8 border border-custom-border shadow-sm flex flex-col gap-6 text-left">
                    <div>
                      <h3 className="font-serif font-light text-2xl text-custom-dark-text">The Hall of Legends</h3>
                      <p className="text-custom-soft-text text-sm mt-0.5">Your lifetime milestones of discipline, clarity, and unmatched task completion.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {BADGES.map((badge) => {
                        const isEarned = !!earnedBadges[badge.id];
                        const dateEarned = earnedBadges[badge.id];
                        const daysToGo = badge.days - streakCount;
                        const progressPct = Math.min(100, Math.round((streakCount / badge.days) * 100));

                        if (isEarned) {
                          return (
                            <div 
                              key={badge.id}
                              className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-[#C9A96E]/50 shadow-[0_8px_24px_rgba(201,169,110,0.22)] bg-gradient-to-b from-white to-[#FCFBF8] text-center transition-all hover:scale-[1.05] duration-300 min-h-[190px] relative overflow-hidden group"
                            >
                              <div className="absolute top-0 left-0 w-full h-1 bg-[#C9A96E]" />
                              <span className="text-4xl select-none mb-2.5 animate-pulse">{badge.emoji}</span>
                              <span className="font-bold text-xs text-custom-dark-text tracking-tight">{badge.name}</span>
                              <p className="font-serif italic text-[10px] text-custom-mid-text leading-tight mt-1 px-1 line-clamp-2">
                                "{badge.quote}"
                              </p>
                              <span className="text-[9px] text-[#8C6B16] mt-3 font-bold uppercase tracking-wider bg-[#FAF6EE] px-2 py-0.5 rounded-md border border-[#EAD393]/35">
                                Earned {dateEarned}
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div 
                              key={badge.id}
                              className="flex flex-col items-center justify-center p-5 rounded-2xl border border-custom-border bg-[#FAFAF9] text-center opacity-65 hover:opacity-95 transition-all duration-300 min-h-[190px] flex-shrink-0"
                            >
                              <div className="relative mb-2.5">
                                <span className="text-4xl grayscale select-none filter blur-[0.5px]">{badge.emoji}</span>
                                <span className="absolute -bottom-1 -right-1 bg-custom-mid-text text-white p-0.5 rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center font-bold" title="Locked">
                                  🔒
                                </span>
                              </div>
                              <span className="font-bold text-xs text-custom-soft-text tracking-tight">{badge.name}</span>
                              
                              <div className="w-full mt-3 flex flex-col gap-1">
                                <div className="flex justify-between text-[9px] text-custom-soft-text px-1">
                                  <span>{streakCount}/{badge.days} d</span>
                                  <span>{daysToGo}d to unlock</span>
                                </div>
                                <div className="w-full h-1 bg-custom-card-sec rounded-full overflow-hidden">
                                  <div className="h-full bg-custom-gold/60" style={{ width: `${progressPct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>

                  {/* ACHIEVEMENT BADGES SECTION */}
                  <div className="bg-white rounded-[24px] p-8 border border-custom-border shadow-sm flex flex-col gap-6 text-left">
                    <div>
                      <h3 className="font-serif font-light text-2xl text-custom-dark-text">Achievement Badges</h3>
                      <p className="text-custom-soft-text text-sm mt-0.5">Celebrate real milestones of action, exploration, and balance inside the Kaivora ecosystem.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {ACHIEVEMENT_BADGES.map((badge) => {
                        const isEarned = !!earnedBadges[badge.id];
                        const dateEarned = earnedBadges[badge.id];
                        const currentProgressVal = badge.currentProgress(achStats, goalsList, earnedBadges);
                        const progressPct = Math.min(100, Math.round((currentProgressVal / badge.maxProgress) * 100));

                        if (isEarned) {
                          return (
                            <div 
                              key={badge.id}
                              className="flex flex-col justify-between p-5 rounded-2xl border-2 border-emerald-500/30 shadow-[0_8px_24px_rgba(16,185,129,0.1)] bg-gradient-to-b from-white to-[#F8FCFA] text-left transition-all hover:scale-[1.03] duration-300 min-h-[220px] relative overflow-hidden"
                            >
                              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                              
                              <div>
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-3xl select-none">{badge.emoji}</span>
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                    ✓ Completed
                                  </span>
                                </div>
                                
                                <span className="font-bold text-xs text-custom-dark-text block tracking-tight">{badge.name}</span>
                                <p className="text-[11px] text-custom-soft-text leading-relaxed mt-1">
                                  {badge.desc}
                                </p>
                              </div>

                              <div className="mt-4">
                                <div className="flex justify-between text-[9px] text-emerald-700 font-semibold mb-1">
                                  <span>Progress</span>
                                  <span>{currentProgressVal} / {badge.maxProgress}</span>
                                </div>
                                <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                                </div>
                                {dateEarned && (
                                  <div className="text-[8px] text-custom-soft-text mt-2 uppercase font-bold tracking-wider">
                                    Unlocked {dateEarned}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div 
                              key={badge.id}
                              className="flex flex-col justify-between p-5 rounded-2xl border border-custom-border bg-[#FAFAF9] text-left opacity-75 hover:opacity-100 transition-all duration-300 min-h-[220px]"
                            >
                              <div>
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-3xl grayscale opacity-40 select-none">{badge.emoji}</span>
                                  <span className="text-[10px] text-custom-soft-text/50">🔒 Locked</span>
                                </div>
                                
                                <span className="font-bold text-xs text-custom-soft-text block tracking-tight">{badge.name}</span>
                                <p className="text-[11px] text-custom-soft-text leading-relaxed mt-1">
                                  {badge.desc}
                                </p>
                              </div>

                              <div className="mt-4">
                                <div className="flex justify-between text-[9px] text-custom-soft-text font-medium mb-1">
                                  <span>Requirement</span>
                                  <span>{currentProgressVal} / {badge.maxProgress}</span>
                                </div>
                                <div className="w-full h-1.5 bg-custom-card-sec rounded-full overflow-hidden">
                                  <div className="h-full bg-custom-gold/50" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="text-[8px] text-custom-soft-text/60 mt-2 uppercase font-semibold">
                                  {badge.req}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* AI COACH TAB VIEW */}
        {activeTab === 'AI Coach' && (
          <AICoachPage
            tasks={tasks}
            setTasks={setTasks}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            voiceProfiles={voiceProfiles}
            handleReminderActionStartFocus={handleReminderActionStartFocus}
            toggleTaskCompletion={toggleTaskCompletion}
            userApiKey={userApiKey}
            isDarkMode={isDarkMode}
            streakCount={streakCount}
            longestStreak={longestStreak}
          />
        )}

        {/* VOICE PROFILES TAB VIEW */}
        {activeTab === 'Voice Profiles' && (
          <VoiceProfilesPage
            voiceProfiles={voiceProfiles}
            setVoiceProfiles={setVoiceProfiles}
            showToast={(message, type) => showToast(message, type as any)}
          />
        )}

        {/* BROWSER NOTIFICATION DIAGNOSTICS PAGE */}
        {activeTab === 'Diagnostics' && (
          <div className="bg-white rounded-[24px] p-8 border border-custom-border max-w-4xl flex flex-col gap-8 shadow-sm animate-scale-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-custom-border">
              <div className="text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-custom-sage/10 text-custom-sage flex items-center justify-center shadow-inner">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-light text-2xl text-custom-dark-text">
                      Notification Diagnostics
                    </h3>
                    <p className="text-custom-soft-text text-sm mt-0.5">
                      Verify browser API support, authorize alert clearances, and run dispatch tests.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('Settings')}
                  className="bg-custom-card-sec/40 hover:bg-custom-card-sec border border-custom-border text-custom-dark-text text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Settings size={13} />
                  Settings Page
                </button>
              </div>
            </div>

            {/* Grid Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Browser API Support */}
              <div className="bg-custom-card-sec/10 border border-custom-border/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">1. Platform Compatibility</span>
                    <span className="p-1 rounded bg-white dark:bg-white/5 border border-custom-border">
                      <Clock size={13} className="text-custom-soft-text" />
                    </span>
                  </div>
                  <h4 className="font-serif font-light text-lg text-custom-dark-text text-left">Browser Support</h4>
                  <p className="text-xs text-custom-soft-text mt-2 text-left leading-relaxed">
                    Determines if your current browser program supports the standard web Notifications API.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-custom-border/40 flex items-center justify-between">
                  <span className="text-xs text-custom-mid-text font-medium">Status:</span>
                  {'Notification' in window ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-custom-sage/10 text-custom-sage border border-custom-sage/20 flex items-center gap-1">
                      <Check size={11} /> Supported
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-100 flex items-center gap-1">
                      <X size={11} /> Unsupported
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Notification Permission */}
              <div className="bg-custom-card-sec/10 border border-custom-border/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">2. Access Rights</span>
                    <span className="p-1 rounded bg-white dark:bg-white/5 border border-custom-border">
                      <Bell size={13} className="text-custom-soft-text" />
                    </span>
                  </div>
                  <h4 className="font-serif font-light text-lg text-custom-dark-text text-left">System Permission</h4>
                  <p className="text-xs text-custom-soft-text mt-2 text-left leading-relaxed">
                    Specifies whether your operating system and web browser allow Kaivora to deliver desktop banners.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-custom-border/40 flex items-center justify-between">
                  <span className="text-xs text-custom-mid-text font-medium">Clearance:</span>
                  {notificationPermission === 'granted' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-custom-sage/10 text-custom-sage border border-custom-sage/20 flex items-center gap-1">
                      <Check size={11} /> GRANTED
                    </span>
                  )}
                  {notificationPermission === 'default' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center gap-1 animate-pulse">
                      ASK
                    </span>
                  )}
                  {notificationPermission === 'denied' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-100 flex items-center gap-1">
                      <X size={11} /> DENIED
                    </span>
                  )}
                </div>
              </div>

              {/* Card 3: Kaivora App Toggle */}
              <div className="bg-custom-card-sec/10 border border-custom-border/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">3. Application Switch</span>
                    <span className="p-1 rounded bg-white dark:bg-white/5 border border-custom-border">
                      <Plus size={13} className="text-custom-soft-text" />
                    </span>
                  </div>
                  <h4 className="font-serif font-light text-lg text-custom-dark-text text-left">Kaivora Reminders</h4>
                  <p className="text-xs text-custom-soft-text mt-2 text-left leading-relaxed">
                    User-configured flag inside Kaivora allowing smart task evaluations and deadline reminders to run.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-custom-border/40 flex items-center justify-between">
                  <span className="text-xs text-custom-mid-text font-medium">Toggle Flag:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                    aiRemindersEnabled 
                      ? 'bg-custom-sage/10 text-custom-sage border-custom-sage/20' 
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {aiRemindersEnabled ? 'ACTIVE' : 'MUTED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Standing Banner & App-Level Disable Logic */}
            <div className="bg-custom-card-sec/20 border border-custom-border rounded-[20px] p-6 flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-left">
                  <h4 className="font-serif font-light text-lg text-custom-dark-text">Overall Standing:</h4>
                  <p className="text-xs text-custom-soft-text mt-1">
                    Combined system evaluation of browser permissions and internal preferences.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-custom-soft-text font-medium">Notification Status:</span>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${
                    notificationPermission === 'granted' && aiRemindersEnabled
                      ? 'bg-custom-sage/10 text-custom-sage border border-custom-sage/20'
                      : 'bg-custom-rust/10 text-custom-rust border border-custom-rust/20'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      notificationPermission === 'granted' && aiRemindersEnabled ? 'bg-custom-sage animate-ping' : 'bg-custom-rust'
                    }`} />
                    {notificationPermission === 'granted' && aiRemindersEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Special Case: Disabled Only inside the App (granted but flag is false) */}
              {notificationPermission === 'granted' && !aiRemindersEnabled && (
                <div className="bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      ⚠️ Muted Inside Kaivora Only
                    </span>
                    <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1 leading-relaxed">
                      Your browser has fully granted notification access, but you have disabled alerts inside Kaivora's settings. Enable them instantly with the toggle below.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAiRemindersEnabled(true);
                      localStorage.setItem('kaivora_ai_reminders_enabled', 'true');
                      showToast("🔔 AI Reminders enabled!", "success");
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-sm flex-shrink-0"
                  >
                    Enable Notifications Now
                  </button>
                </div>
              )}

              {/* Combined Controller Switch (Always visible so users can toggle in-app audio/voice warnings even if browser permission is blocked) */}
              <div className="flex flex-col gap-3 p-4 bg-white dark:bg-white/5 border border-custom-border/60 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h5 className="text-xs font-semibold text-custom-dark-text dark:text-white">Kaivora AI Companion Reminders</h5>
                    <p className="text-[10px] text-custom-soft-text mt-0.5">Toggle proactive spoken voice alerts, custom audio profile playbacks, and in-app toasts.</p>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = !aiRemindersEnabled;
                      setAiRemindersEnabled(nextVal);
                      localStorage.setItem('kaivora_ai_reminders_enabled', String(nextVal));
                      showToast(nextVal ? "🔔 AI Reminders and Voice alerts enabled!" : "🔕 AI Reminders disabled.", "info");
                    }}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer relative flex items-center ${
                      aiRemindersEnabled ? 'bg-custom-sage' : 'bg-gray-200 dark:bg-white/10'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out absolute ${
                        aiRemindersEnabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
                {notificationPermission !== 'granted' && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium text-left bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 leading-relaxed">
                    ℹ️ <strong>Iframe Notice:</strong> System push notifications are blocked inside this preview frame. However, by turning this toggle <strong>ON</strong>, Kaivora's spoken voice announcements, custom audio profiles, and top-of-screen toasts will still work perfectly inside this window!
                  </p>
                )}
              </div>
            </div>

            {/* Diagnostics Action Panel */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-6 bg-custom-card-sec/10 border border-custom-border rounded-2xl">
              <div className="text-left">
                <h4 className="text-sm font-semibold text-custom-dark-text dark:text-white">Diagnostic Controls</h4>
                <p className="text-xs text-custom-soft-text mt-0.5">Request authorization credentials or fire live simulated tests.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="bg-custom-sage hover:bg-custom-sage/90 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full cursor-pointer transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Bell size={13} />
                    Request Permission
                  </button>
                )}

                <button
                  onClick={() => {
                    if (!('Notification' in window)) {
                      showToast("Browser notifications are not supported on this browser.", "error");
                      return;
                    }
                    if (Notification.permission !== 'granted') {
                      showToast("Cannot dispatch test notification. Permission is not granted.", "error");
                      return;
                    }
                    try {
                      new Notification("🧠 Kaivora Test — Notifications are working successfully!", {
                        body: "Success! Your browser alerts are fully configured and ready for smart coaching. 🌿",
                      });
                      showToast("Success! Test notification dispatched.", "success");
                    } catch (e) {
                      console.error(e);
                      showToast("System blocked the alert. Please check your OS Do Not Disturb settings.", "error");
                    }
                  }}
                  className={`text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    notificationPermission === 'granted'
                      ? 'bg-custom-sidebar text-white hover:bg-custom-sidebar/90 border border-custom-sidebar/10 shadow-sm'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  }`}
                  disabled={notificationPermission !== 'granted'}
                  title={notificationPermission !== 'granted' ? "Authorize permission to send a test notification" : "Send test alert"}
                >
                  <Send size={13} />
                  Send Test Notification
                </button>
              </div>
            </div>

            {/* Error / Failure Explanation Block */}
            {notificationPermission !== 'granted' && (
              <div className="bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-900/60 rounded-2xl p-6 text-left flex flex-col gap-3 shadow-inner">
                <h5 className="font-serif text-red-950 dark:text-red-100 text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="text-custom-rust dark:text-red-400" size={18} />
                  Why am I not receiving notifications?
                </h5>
                <p className="text-xs text-red-900 dark:text-red-200 font-semibold leading-relaxed">
                  {notificationPermission === 'default' && (
                    "Your system notification standing is currently 'ASK'. The browser is waiting for you to click 'Request Permission' and choose 'Allow' on the browser's authorization prompt popup."
                  )}
                  {notificationPermission === 'denied' && (
                    "Your system notification standing is 'BLOCKED'. The browser has explicitly blacklisted Kaivora's permissions on this device. You MUST manually unblock Kaivora in your browser settings to receive any smart coaching alerts."
                  )}
                </p>

                <div className="mt-2 border-t border-red-200/50 dark:border-red-900/40 pt-4 flex flex-col gap-3">
                  <h6 className="text-xs font-bold text-red-950 dark:text-red-100 uppercase tracking-wider">Browser Configuration Guide:</h6>
                  <ul className="list-disc pl-5 space-y-2 text-[11px] text-red-900 dark:text-red-200 leading-relaxed font-medium">
                    <li>
                      <strong className="text-red-950 dark:text-red-100 font-bold">Google Chrome / Brave / Edge:</strong> Click the security lock icon (🔒) or connection tuning icon next to the URL in your browser search address bar. Toggle <strong className="text-red-950 dark:text-red-100 font-bold">Notifications</strong> to <strong className="text-red-950 dark:text-red-100 font-bold">Allow</strong>. Refresh the page afterwards.
                    </li>
                    <li>
                      <strong className="text-red-950 dark:text-red-100 font-bold">Apple Safari:</strong> Open <strong className="text-red-950 dark:text-red-100 font-bold">Safari &gt; Settings</strong> in your system menu bar. Click the <strong className="text-red-950 dark:text-red-100 font-bold">Websites</strong> tab, choose <strong className="text-red-950 dark:text-red-100 font-bold">Notifications</strong> in the left rail, look for this application URL in the list, and toggle status to <strong className="text-red-950 dark:text-red-100 font-bold">Allow</strong>.
                    </li>
                    <li>
                      <strong className="text-red-950 dark:text-red-100 font-bold">Mozilla Firefox:</strong> Click the dialog balloon next to the address bar. Delete the blocked notification permission option and reload the web page to request it afresh.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB VIEW */}
        {activeTab === 'Settings' && (
          <div className="bg-white rounded-[20px] p-8 border border-custom-border max-w-2xl flex flex-col gap-6 shadow-sm">
            <div>
              <h3 className="font-serif font-light text-2xl text-custom-dark-text">
                Settings & Integration
              </h3>
              <p className="text-custom-soft-text text-sm mt-1">
                Configure your integrations, personalized AI assistants, and API credentials.
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-custom-border/60 pt-5">
              <label className="text-xs font-bold tracking-wider text-custom-mid-text uppercase">
                Gemini API Key
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="password"
                  value={userApiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="Enter your Gemini API Key..."
                  className="bg-custom-card-sec/30 border border-custom-border rounded-xl px-4 py-3 text-sm text-custom-dark-text outline-none focus:border-custom-sage/60 transition-all font-mono"
                />
                <p className="text-xs text-custom-soft-text leading-relaxed">
                  Your API key is saved strictly on your local browser's storage and is proxied through our secure backend to prevent exposure. By default, the application will use the system key if none is provided.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-custom-border/60 pt-5">
              <label className="text-xs font-bold tracking-wider text-custom-mid-text uppercase">
                Browser Notifications
              </label>
              
              <div className="bg-custom-card-sec/20 border border-custom-border rounded-2xl p-5 flex flex-col gap-5">
                {/* Active Status Display */}
                <div className="flex flex-wrap gap-4 items-center justify-between pb-4 border-b border-custom-border/40">
                  <div className="text-left">
                    <h5 className="text-xs font-semibold text-custom-dark-text dark:text-white">Active App Status</h5>
                    <p className="text-[11px] text-custom-soft-text mt-0.5">Overall alert standing for deadline & AI reminders</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    notificationPermission === 'granted' && aiRemindersEnabled
                      ? 'bg-custom-sage/10 text-custom-sage border border-custom-sage/20'
                      : 'bg-custom-rust/10 text-custom-rust border border-custom-rust/20'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      notificationPermission === 'granted' && aiRemindersEnabled ? 'bg-custom-sage' : 'bg-custom-rust'
                    }`} />
                    {notificationPermission === 'granted' && aiRemindersEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-custom-dark-text dark:text-white">Permission Status</span>
                    <span className="text-xs text-custom-soft-text flex items-center gap-1.5 mt-1">
                      {notificationPermission === 'granted' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-custom-sage" />
                          <span className="text-custom-sage font-medium">Browser granted & authorized</span>
                        </>
                      )}
                      {notificationPermission === 'default' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-amber-600 font-medium">Click below to authorize on this device</span>
                        </>
                      )}
                      {notificationPermission === 'denied' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-red-500 font-medium">Blocked by browser policy</span>
                        </>
                      )}
                    </span>
                  </div>

                <div className="flex flex-col gap-4 p-4 bg-white dark:bg-white/5 border border-custom-border/60 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h5 className="text-xs font-semibold text-custom-dark-text dark:text-white">Kaivora AI Companion Reminders</h5>
                      <p className="text-[10px] text-custom-soft-text mt-0.5">Toggle spoken voice warnings, custom voice profiles, and in-app toasts.</p>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !aiRemindersEnabled;
                        setAiRemindersEnabled(nextVal);
                        localStorage.setItem('kaivora_ai_reminders_enabled', String(nextVal));
                        showToast(nextVal ? "🔔 AI Reminders and Voice alerts enabled!" : "🔕 AI Reminders disabled.", "info");
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer relative flex items-center flex-shrink-0 ${
                        aiRemindersEnabled ? 'bg-custom-sage' : 'bg-gray-200 dark:bg-white/10'
                      }`}
                      title="Toggle notifications directly in Kaivora"
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out absolute ${
                          aiRemindersEnabled ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {notificationPermission !== 'granted' && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg gap-3 mt-1">
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed text-left max-w-lg">
                        ⚠️ <strong>Iframe Security Block:</strong> Standard desktop banners are blocked inside the preview. But don't worry! By enabling the toggle above, you'll still get <strong>all audio speech voice playbacks, voice profiles, and in-app toasts</strong> right here!
                      </p>
                      <button
                        onClick={requestNotificationPermission}
                        className="bg-custom-sage hover:bg-custom-sage/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto"
                      >
                        <Bell size={11} />
                        Request Permission
                      </button>
                    </div>
                  )}
                </div>
                </div>

                {notificationPermission === 'granted' && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-custom-card-sec/10 rounded-xl border border-custom-border/50 gap-3">
                    <div className="text-left">
                      <h6 className="text-xs font-semibold text-custom-dark-text dark:text-white">Verify browser integration</h6>
                      <p className="text-[10px] text-custom-soft-text mt-0.5">Test if alerts are properly displaying on your system notification tray.</p>
                    </div>
                    <button
                      onClick={sendTestNotification}
                      className="bg-white hover:bg-custom-card-sec border border-custom-border text-custom-dark-text text-xs font-semibold px-4.5 py-2 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                    >
                      <span className="text-xs">📣</span>
                      Send Test Notification
                    </button>
                  </div>
                )}

                {notificationPermission === 'denied' && (
                  <div className="bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-900/60 rounded-xl p-4 text-xs text-red-900 dark:text-red-200 leading-relaxed flex flex-col gap-2 shadow-inner">
                    <span className="font-bold flex items-center gap-1 text-red-950 dark:text-red-100">
                      ⚠️ How to enable browser notifications:
                    </span>
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-red-900 dark:text-red-200 text-left font-medium">
                      <li><strong className="text-red-950 dark:text-red-100 font-bold">Chrome / Brave / Edge:</strong> Click the lock icon (🔒) or permission bubble to the left of the URL in the address bar, then change <strong className="text-red-950 dark:text-red-100 font-bold">Notifications</strong> to <strong className="text-red-950 dark:text-red-100 font-bold">Allow</strong>.</li>
                      <li><strong className="text-red-950 dark:text-red-100 font-bold">Safari:</strong> Go to <strong className="text-red-950 dark:text-red-100 font-bold">Safari &gt; Settings &gt; Websites &gt; Notifications</strong>, find this website's URL, and select <strong className="text-red-950 dark:text-red-100 font-bold">Allow</strong>.</li>
                      <li><strong className="text-red-950 dark:text-red-100 font-bold">Firefox:</strong> Click the shield or speech bubble icon to the left of the address bar, clear the <strong>Blocked</strong> permission, and refresh the page.</li>
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-custom-border/40 mt-1">
                  <button
                    onClick={() => setActiveTab('Diagnostics')}
                    className="text-xs text-custom-sage hover:text-custom-sage/85 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    id="settings-diagnostics-link"
                    title="Launch Browser Notification Diagnostics"
                  >
                    🔍 Launch Full Notification Diagnostics Page &rarr;
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-custom-border/60 pt-5">
              <h4 className="text-xs font-bold tracking-wider text-custom-mid-text uppercase">
                System Status
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-custom-card-sec/30 border border-custom-border/60 rounded-xl p-4 flex flex-col">
                  <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">
                    Gemini Connection
                  </span>
                  <span className="text-sm font-semibold text-custom-sage mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-custom-sage animate-pulse" />
                    {userApiKey ? "Using Custom Key" : "Using Cloud Default Key"}
                  </span>
                </div>
                <div className="bg-custom-card-sec/30 border border-custom-border/60 rounded-xl p-4 flex flex-col">
                  <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">
                    Speech Services
                  </span>
                  <span className="text-sm font-semibold text-custom-sage mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-custom-sage" />
                    Active & Available
                  </span>
                </div>
              </div>
            </div>

            {/* Help & Troubleshooting Link */}
            <div className="flex justify-end pt-4 border-t border-custom-border/40">
              <button
                onClick={() => setActiveTab('Help')}
                className="text-xs text-custom-sage hover:text-custom-sage/85 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Open Help & Troubleshooting Guide"
              >
                ❓ Still facing issues? Open Help & FAQ &rarr;
              </button>
            </div>
          </div>
        )}

        {/* HELP & TROUBLESHOOTING TAB VIEW */}
        {activeTab === 'Help' && (
          <div className="bg-white rounded-[24px] p-8 border border-custom-border max-w-4xl flex flex-col gap-8 shadow-sm animate-scale-up text-left">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-custom-border">
              <div className="text-left flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-custom-sage/10 text-custom-sage flex items-center justify-center shadow-inner">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-light text-2xl text-custom-dark-text">
                    Help & Troubleshooting
                  </h3>
                  <p className="text-custom-soft-text text-sm mt-1">
                    Find quick answers to common issues and learn how to optimize your experience.
                  </p>
                </div>
              </div>
            </div>

            {/* Accordion FAQ section */}
            <div className="flex flex-col gap-4">
              {[
                {
                  id: 'ai-503',
                  question: 'AI is not responding (503 or high demand)',
                  answer: 'The AI service may be temporarily busy due to high traffic. If you experience delays or non-responsiveness, please wait a few minutes before trying again. The system automatically recovers once resources are available.'
                },
                {
                  id: 'notifications',
                  question: 'Notifications are not working',
                  answer: 'To receive push notifications, browser notification permission must be allowed. Please note that standard notifications do not work inside the Google AI Studio preview frame due to security constraints. To test them fully, click the "Open in a new tab" button to open the deployed app in a normal browser tab.'
                },
                {
                  id: 'ai-error',
                  question: 'AI returns an error',
                  answer: 'If the AI returns an error, please check your internet connection, refresh the page, and try again. Most errors are transient and occur if the AI service is temporarily unavailable or if there is a brief interruption in connectivity.'
                },
                {
                  id: 'tasks-missing',
                  question: 'Tasks are missing',
                  answer: 'All tasks and settings are securely saved in your local browser storage (localStorage). If you cleared your browser cache, deleted cookies, or if the app data was reset, the locally stored tasks will be cleared and cannot be recovered. We recommend keeping browser data intact to preserve your productivity history.'
                },
                {
                  id: 'general-tips',
                  question: 'General Tips & Best Practices',
                  answer: 'For the best experience, we recommend using the latest version of Google Chrome or Microsoft Edge. Always keep a stable internet connection, and feel free to refresh the page if any visual elements or features do not load correctly.'
                }
              ].map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-custom-border rounded-xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="w-full flex items-center justify-between p-5 bg-[#FCFBF8] hover:bg-custom-card-sec/20 text-left font-sans font-medium text-custom-dark-text text-sm transition-colors cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        size={16}
                        className={`text-custom-soft-text transition-transform duration-200 ${
                          isExpanded ? 'transform rotate-180 text-custom-sage' : ''
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="p-5 border-t border-custom-border/60 bg-white text-xs text-custom-soft-text leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Friendly message at the bottom */}
            <div className="mt-4 p-5 bg-custom-sage/5 border border-custom-sage/10 rounded-2xl">
              <p className="text-xs text-custom-sage leading-relaxed font-medium text-center">
                Still facing an issue? Try refreshing the app or try again after a few minutes. Most temporary AI issues resolve automatically.
              </p>
            </div>
          </div>
        )}

        {/* DEDICATED AI ASSISTANT WORKSPACE */}
        {activeTab === 'AI Assistant' && (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-[500px] lg:h-[calc(100vh-140px)] animate-scale-up">
            {/* Left side: Chat Console */}
            <div className="lg:col-span-8 bg-white rounded-[24px] border border-custom-border shadow-sm flex flex-col h-full overflow-hidden">
              {/* Chat Header */}
              <div className="p-6 border-b border-custom-border/60 flex items-center justify-between bg-[#FCFBF8]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-custom-sage-light/20 text-custom-sage flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-light text-xl text-custom-dark-text flex items-center gap-2">
                      Kaivora Workspace
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-custom-sage opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-custom-sage"></span>
                      </span>
                    </h3>
                    <p className="text-custom-soft-text text-xs">
                      Your warm, motivating AI productivity companion
                    </p>
                  </div>
                </div>
                <div className="text-xs text-[#8C6B16] bg-[#FAF6EE] border border-[#EAD393]/30 px-3 py-1.5 rounded-full font-medium">
                  💡 Context: {tasks.length} Tasks Loaded
                </div>
              </div>

              {/* Chat Messages Logs */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAFAF9]/30">
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-[20px] p-4 text-sm leading-relaxed border shadow-sm ${
                        msg.sender === 'user' 
                          ? 'bg-custom-sage/10 text-[#1B3225] border-custom-sage/20 rounded-tr-sm' 
                          : 'bg-white text-custom-dark-text border-custom-border/60 rounded-tl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="p-4 border bg-white rounded-[20px] rounded-tl-sm border-custom-border/60 text-custom-soft-text flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 bg-custom-mid-text/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-custom-mid-text/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-custom-mid-text/60 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-6 py-3 border-t border-custom-border/40 bg-white flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider mr-1">Quick Prompts:</span>
                {[
                  "Break down my next task into steps",
                  "Give me some quick motivation to start",
                  "How can I better handle my urgent tasks?",
                  "Create a daily rescue plan for today"
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePromptChipClick(promptText)}
                    className="text-xs text-custom-mid-text bg-[#FAFAF9] hover:bg-custom-sage/10 hover:text-custom-sage border border-custom-border/60 hover:border-custom-sage/30 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Chat Input Area */}
              <div className="p-4 border-t border-custom-border/60 bg-[#FCFBF8]">
                <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 border border-custom-border rounded-xl p-2 pl-4 bg-white shadow-sm">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask anything to Kaivora..."
                    className="bg-transparent border-none outline-none flex-1 text-sm text-custom-dark-text placeholder:text-custom-soft-text min-w-0"
                  />
                  <button 
                    type="submit" 
                    disabled={chatLoading}
                    className="bg-custom-sage hover:bg-custom-sage/95 text-white px-5 py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span>Send</span>
                    <span>⚡</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right side: Companion Status & High Priority Needs */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Companion Card */}
              <div className="bg-white rounded-[24px] p-6 border border-custom-border shadow-sm flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-custom-sage/10 to-transparent rounded-full blur-xl pointer-events-none" />
                <h4 className="font-serif font-light text-lg text-custom-dark-text">Your Companion Status</h4>
                
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-custom-soft-text">Status:</span>
                    <span className="font-bold text-[#1E5631] bg-[#EBF7F0] border border-[#C3E6D0]/40 px-2.5 py-0.5 rounded-full">Listening Live</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-custom-soft-text">Key Integration:</span>
                    <span className={`font-bold px-2.5 py-0.5 rounded-full ${userApiKey ? 'text-[#1E5631] bg-[#EBF7F0] border border-[#C3E6D0]' : 'text-amber-700 bg-amber-50 border border-amber-200'}`}>
                      {userApiKey ? 'Connected' : 'Free Demo Key'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-custom-soft-text">Conversations:</span>
                    <span className="font-mono text-custom-dark-text font-bold">{chatMessages.length} turns</span>
                  </div>
                </div>
                
                <div className="border-t border-custom-border/60 pt-4 mt-2">
                  <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase block mb-2">Kaivora's Prime Directives</span>
                  <ul className="text-xs text-custom-soft-text flex flex-col gap-2 list-disc pl-4 leading-relaxed">
                    <li>To provide gentle, warm encouragement instead of pressure.</li>
                    <li>To instantly draft realistic schedules with short breathing intervals.</li>
                    <li>To initiate Rescue Mode when tasks become overwhelming.</li>
                  </ul>
                </div>
              </div>

              {/* Urgent task focus slot */}
              <div className="bg-[#FAF6EE] rounded-[24px] p-6 border border-[#EAD393]/40 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8C6B16] uppercase tracking-wider">
                  <span>🚨</span>
                  <span>Immediate Focus Needs</span>
                </div>

                <p className="text-xs text-[#8C6B16]/80 leading-relaxed">
                  You currently have <strong className="font-bold">{urgentCount} urgent tasks</strong> pending today. Focus is the antidote to anxiety.
                </p>

                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto mt-1">
                  {tasks.filter(t => !t.completed && t.priority === 'Urgent').map(task => (
                    <div key={task.id} className="bg-white/80 rounded-xl p-3 border border-[#EAD393]/20 flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-custom-dark-text truncate">{task.name}</p>
                        <p className="text-[10px] text-custom-soft-text mt-0.5">{getTaskRemainingTime(task)}</p>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-custom-rust bg-custom-rust/10 px-2 py-0.5 rounded">Urgent</span>
                    </div>
                  ))}
                  {tasks.filter(t => !t.completed && t.priority === 'Urgent').length === 0 && (
                    <div className="text-center py-4 bg-white/40 rounded-xl border border-dashed border-[#EAD393]/40">
                      <span className="text-2xl">🎉</span>
                      <p className="text-xs font-bold text-custom-sage mt-1">All clear! No urgent tasks!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OTHER PLACEHOLDER VIEWS */}
        {activeTab === 'Schedule' && (() => {
          const workTasks = scheduleItems.filter(item => item.priority !== 'Break');
          const totalTasksCount = workTasks.length;

          const totalWorkMinutes = scheduleItems
            .filter(item => item.priority !== 'Break')
            .reduce((sum, item) => sum + parseDurationToMinutes(item.duration), 0);
          const totalWorkHoursFormatted = (totalWorkMinutes / 60).toFixed(1) + ' hrs';

          const totalBreakMinutes = scheduleItems
            .filter(item => item.priority === 'Break')
            .reduce((sum, item) => sum + parseDurationToMinutes(item.duration), 0);
          const totalBreakHoursFormatted = totalBreakMinutes + ' mins';

          let estFinTime = 'N/A';
          if (scheduleItems.length > 0) {
            const lastItem = scheduleItems[scheduleItems.length - 1];
            const startMinutes = parseTimeToMinutes(lastItem.time);
            const durationMins = parseDurationToMinutes(lastItem.duration);
            const endMinutes = (startMinutes + durationMins) % 1440;
            
            let hours = Math.floor(endMinutes / 60);
            const mins = endMinutes % 60;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            if (hours === 0) hours = 12;
            
            const minsStr = mins < 10 ? '0' + mins : mins;
            estFinTime = `${hours}:${minsStr} ${ampm}`;
          }

          const handleCopySchedule = () => {
            if (scheduleItems.length === 0) return;
            const text = scheduleItems.map(item => 
              `${item.time} | ${item.name} | ${item.duration} | ${item.priority || 'Break'}`
            ).join('\n') + `\n\nNOTE: ${scheduleNote}`;
            
            navigator.clipboard.writeText(text);
            showToast("📋 Schedule copied to clipboard!", "success");
          };

          // Find current "NOW" position index
          const nowObj = new Date();
          const currentMins = nowObj.getHours() * 60 + nowObj.getMinutes();
          let nowIndex = -1;
          for (let i = 0; i < scheduleItems.length; i++) {
            const itemMins = parseTimeToMinutes(scheduleItems[i].time);
            if (currentMins < itemMins) {
              nowIndex = i;
              break;
            }
          }
          if (nowIndex === -1 && scheduleItems.length > 0) {
            nowIndex = scheduleItems.length;
          }

          return (
            <div id="ai-schedule-page" className="flex flex-col gap-6 animate-fade-in">
              {/* Header section with heading and buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif font-light text-3xl md:text-4xl text-custom-dark-text tracking-tight">Your AI Schedule</h2>
                  <p className="text-custom-soft-text text-sm mt-1">Let Kaivora plan your perfect day</p>
                </div>
                
                {tasks.length > 0 && !scheduleLoading && scheduleItems.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerateSchedule}
                      className="bg-custom-sage text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full cursor-pointer hover:bg-custom-sage/90 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <span>🔄</span> Regenerate
                    </button>
                    <button
                      onClick={handleCopySchedule}
                      className="bg-white text-custom-dark-text border border-custom-border text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full cursor-pointer hover:bg-custom-card-sec transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <span>📋</span> Copy Schedule
                    </button>
                  </div>
                )}
              </div>

              {/* Conditional main views */}
              {tasks.length === 0 ? (
                <div className="bg-white rounded-[20px] p-12 border border-custom-border shadow-sm flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-custom-rust/10 text-custom-rust flex items-center justify-center">
                    <span className="text-3xl">📝</span>
                  </div>
                  <div>
                    <h3 className="font-serif font-light text-2xl text-custom-dark-text mt-2">No tasks yet!</h3>
                    <p className="text-custom-soft-text text-sm max-w-md mt-1.5">
                      Add some tasks from Dashboard first 📝
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('Dashboard')}
                    className="mt-2 bg-custom-sage text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full cursor-pointer hover:bg-custom-sage/90 transition-all shadow-sm"
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : scheduleLoading ? (
                <div className="bg-white rounded-[20px] p-16 border border-custom-border shadow-sm flex flex-col items-center justify-center text-center gap-4">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-custom-sage/15 animate-ping" />
                    <div className="absolute inset-3 rounded-full bg-custom-sage/25 animate-pulse" />
                    <div className="w-14 h-14 rounded-full bg-custom-sage text-white flex items-center justify-center shadow-md">
                      <Sparkles className="w-7 h-7 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-serif italic text-2xl text-custom-dark-text animate-pulse">Kaivora is planning your perfect day...</h3>
                    <p className="text-custom-soft-text text-sm mt-1.5 max-w-sm mx-auto">
                      Analyzing your tasks, organizing priorities, and embedding mindful rest intervals just for you.
                    </p>
                  </div>
                </div>
              ) : scheduleItems.length === 0 ? (
                <div className="bg-white rounded-[20px] p-16 border border-custom-border shadow-sm flex flex-col items-center justify-center text-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-custom-sage/10 text-custom-sage flex items-center justify-center">
                    <Sparkles size={36} />
                  </div>
                  <div>
                    <h3 className="font-serif font-light text-2xl text-custom-dark-text">Your Day is Unplanned</h3>
                    <p className="text-custom-soft-text text-sm max-w-md mt-2 mx-auto">
                      You have {tasks.filter(t => !t.completed).length} active tasks waiting for today. Let Kaivora analyze them to craft your perfect, stress-free routine.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateSchedule}
                    className="bg-custom-sage text-white text-xs font-bold uppercase tracking-wider px-8 py-4 rounded-full cursor-pointer hover:bg-custom-sage/90 transition-all shadow-md flex items-center gap-2 transform hover:-translate-y-0.5"
                  >
                    <span>✨</span> Generate My Day
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Left Column: Timeline list */}
                  <div className="lg:col-span-2 bg-white rounded-[24px] p-6 md:p-8 border border-custom-border shadow-sm">
                    <h3 className="font-serif font-light text-xl text-custom-dark-text mb-6">Today's Timeline</h3>
                    
                    <div className="relative border-l-2 border-custom-sage/40 pl-8 ml-4 flex flex-col gap-6">
                      {(() => {
                        const elements: React.ReactNode[] = [];
                        const nowMarker = (
                          <div key="now-marker" className="relative -ml-[41px] flex items-center gap-2 py-2">
                            <div className="w-[75px] text-right flex-shrink-0">
                              <span className="text-[10px] font-extrabold tracking-wider text-custom-rust bg-custom-rust/10 px-2 py-0.5 rounded-full uppercase">
                                NOW
                              </span>
                            </div>
                            <div className="w-4 h-4 rounded-full border-2 border-custom-rust bg-custom-bg z-10 -ml-[9px] flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-custom-rust" />
                            </div>
                            <div className="flex-1 border-t-2 border-dashed border-custom-rust/50" />
                          </div>
                        );

                        scheduleItems.forEach((item, idx) => {
                          if (idx === nowIndex) {
                            elements.push(nowMarker);
                          }

                          const itemMins = parseTimeToMinutes(item.time);
                          const nextItem = scheduleItems[idx + 1];
                          const nextMins = nextItem ? parseTimeToMinutes(nextItem.time) : itemMins + parseDurationToMinutes(item.duration);
                          const isActive = currentMins >= itemMins && currentMins < nextMins;

                          const isBreak = item.priority === 'Break' || item.name.toLowerCase().includes('break') || item.name.toLowerCase().includes('lunch') || item.name.toLowerCase().includes('coffee') || item.name.toLowerCase().includes('rest');

                          elements.push(
                            <div 
                              key={`item-${idx}`} 
                              className={`relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                                isActive 
                                  ? 'bg-custom-sage/10 border-custom-sage shadow-sm' 
                                  : isBreak
                                    ? 'bg-custom-card-sec/40 border-custom-border/50 opacity-90'
                                    : 'bg-white border-custom-border/60 hover:border-custom-border shadow-sm'
                              }`}
                            >
                              {/* Timeline dot */}
                              <div className={`absolute left-[-41px] w-5 h-5 rounded-full border-4 border-[#F5F0EB] z-10 flex items-center justify-center shadow-sm ${item.dotColor}`} />

                              <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 min-w-0 pr-4">
                                <span className="text-xs font-bold text-custom-dark-text md:w-20 flex-shrink-0">
                                  {item.time}
                                </span>

                                <div className="flex items-center gap-2 min-w-0">
                                  {isBreak && <span className="text-base flex-shrink-0">☕</span>}
                                  <span className={`text-xs text-custom-dark-text truncate ${isBreak ? 'text-custom-mid-text italic' : 'font-semibold'}`}>
                                    {item.name}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {!isBreak && item.priority && (
                                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                    item.priority === 'Urgent' 
                                      ? 'text-custom-rust bg-custom-rust/10' 
                                      : item.priority === 'High'
                                        ? 'text-custom-sage bg-custom-sage/10'
                                        : item.priority === 'Medium'
                                          ? 'text-custom-gold bg-custom-gold/10'
                                          : 'text-custom-soft-text bg-custom-card-sec'
                                  }`}>
                                    {item.priority}
                                  </span>
                                )}
                                {isBreak && (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                    Break
                                  </span>
                                )}

                                <span className="text-[11px] font-bold text-custom-mid-text bg-custom-card-sec/80 px-2 py-1 rounded-full border border-custom-border/40 flex items-center gap-1">
                                  <Clock size={11} className="text-custom-soft-text" />
                                  {item.duration}
                                </span>
                              </div>
                            </div>
                          );
                        });

                        if (nowIndex === scheduleItems.length) {
                          elements.push(nowMarker);
                        }

                        return elements;
                      })()}
                    </div>

                    {scheduleNote && (
                      <div className="mt-8 p-6 bg-custom-sage/5 border border-custom-sage/20 rounded-[20px] text-center">
                        <p className="font-serif italic text-custom-sage text-base md:text-lg leading-relaxed">
                          NOTE: {scheduleNote}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Summary Panel */}
                  <div className="bg-white rounded-[24px] p-6 border border-custom-border shadow-sm flex flex-col gap-6 lg:sticky lg:top-6">
                    <div>
                      <h3 className="font-serif font-light text-xl text-custom-dark-text">Day Summary</h3>
                      <p className="text-custom-soft-text text-xs mt-1">Kaivora's analytical overview of your schedule</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-custom-card-sec/50 border border-custom-border/40 p-4 rounded-xl flex flex-col gap-1">
                        <span className="text-[10px] text-custom-soft-text font-bold uppercase tracking-wider">Scheduled Tasks</span>
                        <span className="font-serif text-2xl font-semibold text-custom-dark-text">{totalTasksCount}</span>
                      </div>
                      <div className="bg-custom-card-sec/50 border border-custom-border/40 p-4 rounded-xl flex flex-col gap-1">
                        <span className="text-[10px] text-custom-soft-text font-bold uppercase tracking-wider">Est. Finish</span>
                        <span className="font-serif text-2xl font-semibold text-custom-rust">{estFinTime}</span>
                      </div>
                      <div className="bg-custom-card-sec/50 border border-custom-border/40 p-4 rounded-xl flex flex-col gap-1">
                        <span className="text-[10px] text-custom-soft-text font-bold uppercase tracking-wider">Focused Work</span>
                        <span className="font-serif text-2xl font-semibold text-custom-sage">{totalWorkHoursFormatted}</span>
                      </div>
                      <div className="bg-custom-card-sec/50 border border-custom-border/40 p-4 rounded-xl flex flex-col gap-1">
                        <span className="text-[10px] text-custom-soft-text font-bold uppercase tracking-wider">Break Time</span>
                        <span className="font-serif text-2xl font-semibold text-custom-gold">{totalBreakHoursFormatted}</span>
                      </div>
                    </div>

                    <div className="border-t border-custom-border/60 pt-4 mt-2">
                      <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase block mb-2">Kaivora's Daily Motivation</span>
                      <p className="text-sm text-custom-mid-text italic leading-relaxed font-serif">
                        "{scheduleQuote}"
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'Goals' && (
          <LifeArenasPage 
            userApiKey={userApiKey} 
            showToast={(message, type) => showToast(message, type as any)} 
          />
        )}

        {['Reminders'].includes(activeTab) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
            {/* LEFT COLUMN: ACTIVE REMINDERS & FOCUS SESSIONS (SPAN 7) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Focus Timer Session Block */}
              {focusTimerTask && (
                <div className="bg-gradient-to-br from-custom-sidebar to-custom-sidebar/95 rounded-[24px] p-6 text-white border border-custom-sidebar/10 shadow-lg relative overflow-hidden transition-all">
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-custom-sage-light uppercase bg-white/10 px-2 py-1 rounded">
                        🎯 Active Focus Session
                      </span>
                      <h4 className="font-serif font-light text-xl mt-2 line-clamp-1">{focusTimerTask.name}</h4>
                    </div>
                    <button 
                      onClick={() => {
                        setIsFocusTimerActive(false);
                        setFocusTimerTask(null);
                      }}
                      className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center py-6 gap-3">
                    <div className="font-mono text-5xl md:text-6xl font-light tracking-wider bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
                      {Math.floor(focusTimerSeconds / 60).toString().padStart(2, '0')}
                      <span className="animate-pulse">:</span>
                      {(focusTimerSeconds % 60).toString().padStart(2, '0')}
                    </div>
                    <p className="text-xs text-white/60">
                      Take a deep breath. Focus fully on the next small action.
                    </p>

                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => setIsFocusTimerActive(!isFocusTimerActive)}
                        className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                          isFocusTimerActive 
                            ? 'bg-custom-rust hover:bg-custom-rust/95 text-white' 
                            : 'bg-white text-custom-sidebar hover:bg-white/90'
                        }`}
                      >
                        {isFocusTimerActive ? '⏸ Pause' : '▶ Start'}
                      </button>
                      <button
                        onClick={() => {
                          setFocusTimerSeconds(1500);
                          setIsFocusTimerActive(false);
                        }}
                        className="px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 hover:bg-white/10 transition-all cursor-pointer"
                      >
                        🔄 Reset
                      </button>
                      <button
                        onClick={() => {
                          handleReminderActionMarkComplete(focusTimerTask.id);
                          setFocusTimerTask(null);
                        }}
                        className="px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-custom-sage text-white hover:bg-custom-sage/95 transition-all cursor-pointer"
                      >
                        ✅ Skip to Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Smart Notification / Reminder Panel */}
              {notificationPermission !== 'granted' && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-[20px] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm mb-4">
                  <div className="flex gap-3 text-left">
                    <span className="text-2xl mt-0.5">🔔</span>
                    <div>
                      <h4 className="font-serif font-light text-base text-amber-900 dark:text-amber-300">Enable Browser Notifications</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400/80 max-w-md mt-1 leading-relaxed">
                        To receive real-time proactive Level 1-4 coaching alerts, deadline warnings, and smart voice reminders directly on your device, enable browser notifications.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full sm:w-auto flex-shrink-0">
                    <button
                      onClick={requestNotificationPermission}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider px-4.5 py-2.5 rounded-full cursor-pointer transition-all text-center"
                    >
                      Enable Alerts
                    </button>
                    <button
                      onClick={() => setActiveTab('Diagnostics')}
                      className="bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 text-amber-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider px-4.5 py-2.5 rounded-full cursor-pointer transition-all text-center border border-amber-300/40"
                    >
                      Diagnostics
                    </button>
                  </div>
                </div>
              )}

              {/* Active Smart Notification / Reminder Panel */}
              <div className="bg-white rounded-[24px] p-6 border border-custom-border shadow-sm flex flex-col gap-6 relative">
                <div className="flex justify-between items-center pb-4 border-b border-custom-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-custom-sidebar text-white flex items-center justify-center">
                      <Bell size={16} />
                    </div>
                    <div>
                      <h3 className="font-serif font-light text-lg text-custom-dark-text">AI Alert Center</h3>
                      <p className="text-custom-soft-text text-xs">Real-time coaching evaluation</p>
                    </div>
                  </div>

                  <button
                    onClick={triggerReminderEvaluation}
                    disabled={isEvaluatingReminders}
                    className="bg-custom-sage hover:bg-custom-sage/95 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isEvaluatingReminders ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Evaluating...
                      </>
                    ) : (
                      <>⚡ Evaluate Focus</>
                    )}
                  </button>
                </div>

                {activeReminder ? (
                  (() => {
                    const matchedTask = tasks.find(t => t.id === activeReminder.id) || tasks[0]; // fallback
                    const taskId = matchedTask?.id || "";

                    // Badge details depending on levels
                    let levelBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
                    let levelLabel = "Level 1 – Early Awareness";
                    let levelGradient = "from-emerald-500/5 to-transparent";

                    if (activeReminder.level === 2) {
                      levelBadgeColor = "bg-amber-50 text-amber-700 border-amber-200/60";
                      levelLabel = "Level 2 – Gentle Suggestion";
                      levelGradient = "from-amber-500/5 to-transparent";
                    } else if (activeReminder.level === 3) {
                      levelBadgeColor = "bg-orange-50 text-orange-700 border-orange-200/60";
                      levelLabel = "Level 3 – Risk Warning";
                      levelGradient = "from-orange-500/5 to-transparent";
                    } else if (activeReminder.level === 4) {
                      levelBadgeColor = "bg-red-50 text-red-700 border-red-200/60";
                      levelLabel = "Level 4 – Actionable Assistance";
                      levelGradient = "from-red-500/5 to-transparent";
                    }

                    return (
                      <div className={`rounded-2xl p-5 border border-custom-border bg-gradient-to-b ${levelGradient} transition-all duration-300 flex flex-col gap-4 relative overflow-hidden`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${levelBadgeColor}`}>
                            {levelLabel}
                          </span>
                          <span className="text-[10px] text-custom-soft-text font-mono">
                            {activeReminder.timestamp}
                          </span>
                        </div>

                        <div className="mt-1">
                          <span className="text-xs text-custom-sage font-semibold uppercase tracking-wider block mb-1">
                            Regarding: {matchedTask?.name || "Active Objective"}
                          </span>
                          <p className="font-serif font-light text-lg text-custom-dark-text italic leading-relaxed">
                            "{activeReminder.message}"
                          </p>
                        </div>

                        {activeReminder.reason && (
                          <div className="bg-custom-card-sec/40 rounded-xl p-3 border border-custom-border/60 text-xs text-custom-mid-text leading-relaxed flex items-start gap-2">
                            <span className="text-custom-sage text-sm">💡</span>
                            <div>
                              <span className="font-semibold text-custom-dark-text block mb-0.5">Why I'm reminding you now:</span>
                              {activeReminder.reason}
                            </div>
                          </div>
                        )}

                        {/* Smart actions */}
                        <div className="flex flex-col gap-2 mt-2">
                          <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">
                            Smart Notification Actions
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <button
                              onClick={() => handleReminderActionMarkComplete(taskId)}
                              className="bg-custom-sidebar text-white hover:bg-custom-sidebar/95 py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                            >
                              <span className="text-base">✅</span>
                              <span>Mark Done</span>
                            </button>

                            <button
                              onClick={() => handleReminderActionRemindLater(taskId)}
                              className="bg-white text-custom-dark-text border border-custom-border hover:bg-custom-card-sec py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                            >
                              <span className="text-base">⏰</span>
                              <span>Postpone</span>
                            </button>

                            <button
                              onClick={() => handleReminderActionStartFocus(taskId)}
                              className="bg-white text-custom-dark-text border border-custom-border hover:bg-custom-card-sec py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                            >
                              <span className="text-base">🎯</span>
                              <span>Start Focus</span>
                            </button>

                            <button
                              disabled={isSplittingTask === taskId}
                              onClick={() => handleReminderActionSplit(taskId)}
                              className="bg-white text-custom-dark-text border border-custom-border hover:bg-custom-card-sec py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                            >
                              {isSplittingTask === taskId ? (
                                <Loader2 size={16} className="animate-spin text-custom-sage" />
                              ) : (
                                <span className="text-base">✂️</span>
                              )}
                              <span>Split Steps</span>
                            </button>

                            <button
                              onClick={() => handleReminderActionReschedule(taskId)}
                              className="bg-white text-custom-dark-text border border-custom-border hover:bg-custom-card-sec py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm col-span-2 sm:col-span-1"
                            >
                              <span className="text-base">📅</span>
                              <span>Delay 2d</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-custom-card-sec/30 border border-custom-border/80 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <span>🌿</span>
                    </div>
                    <div>
                      <h4 className="font-serif font-light text-base text-custom-dark-text">Focus Protected</h4>
                      <p className="text-xs text-custom-soft-text max-w-sm mt-1 leading-relaxed">
                        Kaivora's fatigue protection filter is active. Reminders are silenced to preserve your cognitive flow and peace of mind.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Reminder Engine Cognitive Log */}
              <div className="bg-white rounded-[24px] p-6 border border-custom-border shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-custom-border">
                  <span className="text-[10px] font-bold tracking-widest text-custom-mid-text uppercase">
                    AI Cognitive Activity Log
                  </span>
                  <button 
                    onClick={() => setReminderEngineLogs(["🌿 Logs cleared. Ready."])}
                    className="text-[10px] text-custom-soft-text hover:text-custom-dark-text uppercase transition-colors"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto flex flex-col gap-2.5 pr-1 font-mono text-xs">
                  {reminderEngineLogs.map((log, index) => (
                    <div key={index} className="text-custom-soft-text leading-normal flex gap-2">
                      <span className="text-custom-sage flex-shrink-0">›</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: ADAPTIVE LEARNING & SANDBOX SIMULATOR (SPAN 5) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Internal Tab Menu */}
              <div className="bg-white rounded-[24px] p-1.5 border border-custom-border flex gap-1">
                <button
                  onClick={() => setActiveReminderTab('active')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                    activeReminderTab === 'active' 
                      ? 'bg-custom-sidebar text-white' 
                      : 'text-custom-soft-text hover:text-custom-dark-text'
                  }`}
                >
                  ⚡ Sandbox
                </button>
                <button
                  onClick={() => setActiveReminderTab('learning')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                    activeReminderTab === 'learning' 
                      ? 'bg-custom-sidebar text-white' 
                      : 'text-custom-soft-text hover:text-custom-dark-text'
                  }`}
                >
                  📊 Brain Matrix
                </button>
              </div>

              {/* Sandbox Panel */}
              {activeReminderTab === 'active' && (
                <div className="bg-white rounded-[24px] p-6 border border-custom-border shadow-sm flex flex-col gap-5">
                  <div>
                    <h3 className="font-serif font-light text-lg text-custom-dark-text">Time Shift Simulator</h3>
                    <p className="text-custom-soft-text text-xs mt-1 leading-relaxed">
                      Travel forward in time to test progressive reminder levels as deadlines loom and progress remains static.
                    </p>
                  </div>

                  {/* Simulator Slider */}
                  <div className="bg-custom-card-sec/40 rounded-2xl p-4 border border-custom-border/60 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-custom-dark-text">Simulated Time Shift</span>
                      <span className="text-xs font-mono font-bold bg-custom-sage text-white px-2 py-0.5 rounded">
                        {timeShiftDays === 0 ? "Real Time" : `+${timeShiftDays} Days`}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="7"
                      value={timeShiftDays}
                      onChange={(e) => setTimeShiftDays(parseInt(e.target.value, 10))}
                      className="w-full accent-custom-sage cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-custom-soft-text font-mono font-bold">
                      <span>Today</span>
                      <span>+2d</span>
                      <span>+4d</span>
                      <span>+6d</span>
                      <span>+7d</span>
                    </div>
                  </div>

                  {/* Inline Task State Editor */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold tracking-widest text-custom-mid-text uppercase">
                      Configure Task States Inline
                    </span>

                    <div className="max-h-64 overflow-y-auto flex flex-col gap-3 pr-1">
                      {tasks.filter(t => !t.completed).map(task => (
                        <div key={task.id} className="border border-custom-border rounded-xl p-3 flex flex-col gap-2 bg-custom-card-sec/10">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-semibold text-custom-dark-text line-clamp-1">{task.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              task.priority === 'Urgent' ? 'bg-red-50 text-red-600 border border-red-100' :
                              task.priority === 'High' ? 'bg-green-50 text-green-600 border border-green-100' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {task.priority}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <label className="text-[9px] text-custom-soft-text uppercase font-bold block mb-1">
                                Progress: {task.progress ?? 0}%
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={task.progress ?? 0}
                                onChange={(e) => {
                                  const progVal = parseInt(e.target.value, 10);
                                  const wasCompleted = task.completed;
                                  const becameCompleted = progVal === 100;
                                  setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: progVal, completed: becameCompleted, completedAt: becameCompleted ? getTodayDateString() : undefined } : t));
                                  if (becameCompleted && !wasCompleted) {
                                    handleStreakOnCompletion({ ...task, completed: true, completedAt: getTodayDateString() }, task.shieldAwarded);
                                    awardXPForTaskCompletion(task, true);
                                  } else if (!becameCompleted && wasCompleted) {
                                    handleStreakOnUncheck(task);
                                    awardXPForTaskCompletion(task, false);
                                  }
                                }}
                                className="w-full accent-custom-sidebar h-1"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-custom-soft-text uppercase font-bold block mb-1">
                                Duration: {task.estimatedDuration ?? 2}h
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, estimatedDuration: Math.max(0.5, (t.estimatedDuration ?? 2) - 0.5) } : t))}
                                  className="w-5 h-5 rounded bg-custom-card-sec hover:bg-custom-card-sec/80 flex items-center justify-center text-xs text-custom-dark-text border border-custom-border/60"
                                >
                                  -
                                </button>
                                <span className="text-xs font-mono">{task.estimatedDuration ?? 2}</span>
                                <button
                                  onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, estimatedDuration: Math.min(24, (t.estimatedDuration ?? 2) + 0.5) } : t))}
                                  className="w-5 h-5 rounded bg-custom-card-sec hover:bg-custom-card-sec/80 flex items-center justify-center text-xs text-custom-dark-text border border-custom-border/60"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Adaptive Brain Matrix Panel */}
              {activeReminderTab === 'learning' && (
                <div className="bg-white rounded-[24px] p-6 border border-custom-border shadow-sm flex flex-col gap-6">
                  <div>
                    <h3 className="font-serif font-light text-lg text-custom-dark-text">Adaptive Learning Brain</h3>
                    <p className="text-custom-soft-text text-xs mt-1 leading-relaxed">
                      Kaivora's cognitive models continually learn from when you complete objectives and when you dismiss reminders.
                    </p>
                  </div>

                  {/* Brain stats cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-custom-border rounded-2xl p-4 text-center flex flex-col gap-1 bg-custom-card-sec/10">
                      <span className="text-[10px] font-bold tracking-wider text-custom-soft-text uppercase">Noise Filtered</span>
                      <span className="text-2xl font-serif text-custom-sage font-light">{learningData.fatiguePreventionCount}</span>
                      <span className="text-[9px] text-custom-soft-text">Notification Fatigue avoided</span>
                    </div>

                    <div className="border border-custom-border rounded-2xl p-4 text-center flex flex-col gap-1 bg-custom-card-sec/10">
                      <span className="text-[10px] font-bold tracking-wider text-custom-soft-text uppercase">Adherence Ratio</span>
                      <span className="text-2xl font-serif text-custom-dark-text font-light">
                        {learningData.ignoredCount === 0 && learningData.completedCount === 0 ? "100%" : 
                          `${Math.round((learningData.completedCount / (learningData.completedCount + learningData.ignoredCount)) * 100)}%`}
                      </span>
                      <span className="text-[9px] text-custom-soft-text">Reminders acted upon</span>
                    </div>
                  </div>

                  {/* Preferred hours configuration */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold tracking-widest text-custom-mid-text uppercase">
                      Preferred Working Hours
                    </span>
                    <div className="flex items-center gap-3 bg-custom-card-sec/30 border border-custom-border/80 rounded-xl p-3">
                      <div className="flex-1">
                        <label className="text-[9px] text-custom-soft-text uppercase font-bold block mb-1">Start Hour</label>
                        <input
                          type="time"
                          value={learningData.preferredHoursStart}
                          onChange={(e) => setLearningData(prev => ({ ...prev, preferredHoursStart: e.target.value }))}
                          className="bg-white border border-custom-border rounded-lg p-1.5 text-xs text-custom-dark-text outline-none w-full"
                        />
                      </div>
                      <div className="text-custom-soft-text text-xs font-bold pt-4">to</div>
                      <div className="flex-1">
                        <label className="text-[9px] text-custom-soft-text uppercase font-bold block mb-1">End Hour</label>
                        <input
                          type="time"
                          value={learningData.preferredHoursEnd}
                          onChange={(e) => setLearningData(prev => ({ ...prev, preferredHoursEnd: e.target.value }))}
                          className="bg-white border border-custom-border rounded-lg p-1.5 text-xs text-custom-dark-text outline-none w-full"
                        />
                      </div>
                    </div>
                    <span className="text-[9px] text-custom-soft-text leading-relaxed">
                      💡 Kaivora mutes routine level 1 and 2 notifications outside this window to protect your sleep, recovery, and quiet hours.
                    </span>
                  </div>

                  {/* Frequently Postponed */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold tracking-widest text-custom-mid-text uppercase">
                      Frequently Postponed Tasks
                    </span>

                    {learningData.postponedTasks && learningData.postponedTasks.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {learningData.postponedTasks.map((taskName, i) => (
                          <span key={i} className="text-xs bg-red-50 text-red-600 border border-red-100/60 font-medium py-1 px-2.5 rounded-lg flex items-center gap-1">
                            ⚠️ {taskName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-custom-soft-text italic py-2 bg-custom-card-sec/10 border border-custom-border border-dashed rounded-xl text-center">
                        No frequently postponed tasks. Great focus!
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION CONTAINER */}
        {toast && (
          <div 
            id="toast-notification"
            className={`fixed z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 transition-all duration-300 transform translate-y-0 scale-100 ${
              toast.position === 'top' 
                ? 'top-6 left-1/2 -translate-x-1/2 max-w-xl w-[90%]' 
                : 'bottom-6 right-6 max-w-sm w-auto'
            } ${
              toast.type === 'success' 
                ? 'bg-[#EBF7F0] border-[#C3E6D0] text-[#1E5631]' 
                : toast.type === 'error'
                  ? 'bg-[#FDF3EE] border-[#F2D2C4] text-[#8C2C16]'
                  : toast.type === 'rust'
                    ? 'bg-[#FCF4F0] border-[#F3D7CD] text-[#A64A2E]'
                    : toast.type === 'gold'
                      ? 'bg-[#FCF9F0] border-[#EAD393] text-[#8C6B16] shadow-[0_0_15px_rgba(201,169,110,0.3)]'
                      : 'bg-white border-custom-border text-custom-dark-text'
            }`}
          >
            {toast.type === 'error' || toast.type === 'rust' ? (
              <AlertTriangle size={18} className="text-custom-rust flex-shrink-0" />
            ) : toast.type === 'gold' ? (
              <span className="text-lg flex-shrink-0 select-none">🏆</span>
            ) : (
              <span className="text-lg flex-shrink-0">✦</span>
            )}
            <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
          </div>
        )}

        {/* RESCUE PLAN MODAL */}
        {isRescueModalOpen && (
          <div 
            id="rescue-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-custom-sidebar/85 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto"
            onClick={() => setIsRescueModalOpen(false)}
          >
            <div 
              id="rescue-modal"
              className="bg-white rounded-[24px] border border-custom-border w-full max-w-[650px] p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6 animate-scale-up max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsRescueModalOpen(false)}
                className="absolute top-6 right-6 text-custom-soft-text hover:text-custom-dark-text bg-custom-card-sec/50 hover:bg-custom-card-sec p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Title Header */}
              <div className="flex flex-col items-center text-center gap-2 pb-2 border-b border-custom-border/50">
                <span className="text-4xl select-none animate-bounce mt-2">🚨</span>
                <h3 className="font-serif text-3xl italic font-medium text-custom-rust">
                  Your Rescue Plan
                </h3>
                <p className="text-xs text-custom-soft-text uppercase font-bold tracking-widest">
                  EMERGENCY ACTION PROTOCOL
                </p>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6">
                {/* Loading Content */}
                {rescueLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 size={40} className="text-custom-rust animate-spin" />
                    <p className="text-sm font-semibold text-custom-mid-text animate-pulse">
                      Kaivora is building your rescue plan...
                    </p>
                  </div>
                )}

                {/* Error Content */}
                {!rescueLoading && rescuePlanError && (
                  <div className="flex flex-col items-center justify-center p-8 text-center gap-3 bg-[#FCF5F1] border border-[#F2D2C4] rounded-2xl">
                    <AlertTriangle size={32} className="text-custom-rust" />
                    <p className="text-sm font-semibold text-[#8C2C16] leading-tight">
                      {rescuePlanError}
                    </p>
                    <p className="text-xs text-[#9B5B4C] max-w-sm mt-0.5">
                      Please set your personal API key in Settings or try again.
                    </p>
                    <button 
                      onClick={() => {
                        setIsRescueModalOpen(false);
                        setActiveTab('Settings');
                      }}
                      className="mt-3 bg-[#C06B4A] hover:bg-[#A95939] text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full cursor-pointer transition-all"
                    >
                      Go to Settings
                    </button>
                  </div>
                )}

                {/* Completed / All Clear Content */}
                {!rescueLoading && !rescuePlanError && tasks.filter(t => (t.priority === 'Urgent' || t.priority === 'High') && !t.completed).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-custom-sage/10 text-custom-sage flex items-center justify-center">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <div>
                      <h4 className="font-serif text-2xl font-medium text-custom-sage italic">
                        You're all clear!
                      </h4>
                      <p className="text-sm text-custom-soft-text mt-1.5 max-w-sm font-medium leading-relaxed">
                        No urgent or high priority tasks right now. Keep up the great work!
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsRescueModalOpen(false)}
                      className="mt-4 bg-custom-sage hover:bg-custom-sage/90 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full cursor-pointer transition-all"
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* AI Rescue Plan Output */}
                {!rescueLoading && !rescuePlanError && rescuePlanText && tasks.filter(t => (t.priority === 'Urgent' || t.priority === 'High') && !t.completed).length > 0 && (() => {
                  const parsed = parseRescuePlanText(rescuePlanText);
                  return (
                    <div className="flex flex-col gap-6">
                      {/* Rows */}
                      <div className="flex flex-col gap-4">
                        {parsed.steps.length > 0 ? (
                          parsed.steps.map((step, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-start gap-4 p-4 rounded-xl border border-custom-border/50 bg-[#FAF9F7] hover:border-custom-rust/30 transition-all group"
                            >
                              {/* Dot */}
                              <div className="w-2.5 h-2.5 rounded-full bg-[#C06B4A] mt-1.5 flex-shrink-0 group-hover:scale-125 transition-transform" />
                              {/* Content */}
                              <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 flex-1">
                                <span className="text-sm font-bold text-[#C06B4A] sm:min-w-[110px] flex-shrink-0 font-sans">
                                  {step.time}
                                </span>
                                <span className="text-sm text-custom-dark-text font-medium leading-relaxed">
                                  {step.action}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-custom-dark-text font-medium leading-relaxed whitespace-pre-wrap p-5 bg-[#FAF9F7] rounded-xl border border-custom-border/60">
                            {rescuePlanText}
                          </div>
                        )}
                      </div>

                      {/* Quote Box */}
                      <div className="bg-[#FAF2EE] border border-[#E9D5C8]/80 rounded-2xl p-5 text-center mt-2">
                        <p className="font-serif text-[#C06B4A] italic text-base leading-relaxed">
                          "{parsed.quote}"
                        </p>
                      </div>

                      {/* Footer Close Button */}
                      <button 
                        onClick={() => {
                          setIsRescueModalOpen(false);
                          showToast("Rescue plan generated! You can do this!", "success");
                        }}
                        className="w-full bg-[#C06B4A] hover:bg-[#A95939] text-white font-semibold text-sm py-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer mt-2 text-center"
                      >
                        💪 Let's Conquer This!
                      </button>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        )}

        {/* AI PLAN MODAL POPUP */}
        {activePlanTask && (
          <div 
            id="ai-plan-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-custom-sidebar/60 backdrop-blur-xs p-4 animate-fade-in"
            onClick={() => setActivePlanTask(null)}
          >
            <div 
              id="ai-plan-modal"
              className="bg-white rounded-[24px] border border-custom-border w-full max-w-[550px] p-7 shadow-2xl relative overflow-hidden flex flex-col gap-5 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setActivePlanTask(null)}
                className="absolute top-5 right-5 text-custom-soft-text hover:text-custom-dark-text bg-custom-card-sec/50 hover:bg-custom-card-sec p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Title Header */}
              <div className="flex flex-col gap-1 pr-8">
                <span className="text-[10px] font-bold tracking-widest text-custom-soft-text uppercase">
                  Kaivora Action Plan ✨
                </span>
                <h3 className="font-serif font-light text-2xl text-custom-dark-text leading-tight">
                  {activePlanTask.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                    activePlanTask.priority === 'Urgent' 
                      ? 'bg-custom-rust-light/25 text-custom-rust' 
                      : activePlanTask.priority === 'High' 
                        ? 'bg-custom-sage-light/25 text-custom-sage' 
                        : 'bg-custom-gold/15 text-custom-gold'
                  }`}>
                    {activePlanTask.priority}
                  </span>
                  <span className="text-xs text-custom-soft-text">
                    Deadline: {activePlanTask.deadline}
                  </span>
                </div>
              </div>

              {/* Loading Content */}
              {planLoading && (
                <div className="flex flex-col items-center justify-center p-12 gap-3.5">
                  <Loader2 size={36} className="text-custom-sage animate-spin" />
                  <p className="text-sm font-semibold text-custom-mid-text animate-pulse">Structuring actionable steps...</p>
                </div>
              )}

              {/* AI Output Content */}
              {!planLoading && aiPlanResult && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#FAF8F5] border border-custom-border/60 p-4 rounded-xl">
                    <p className="text-xs text-custom-soft-text italic leading-relaxed text-center">
                      "Five immediate steps designed to break momentum paralysis. Cross them off as you execute."
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {getParsedSteps(aiPlanResult).map((step, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleToggleStep(idx)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                          checkedSteps[idx] 
                            ? 'bg-custom-sage/5 border-custom-sage/30 opacity-70' 
                            : 'bg-white border-custom-border/60 hover:border-custom-sage/40 hover:-translate-y-[1px]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center transition-all flex-shrink-0 ${
                          checkedSteps[idx] 
                            ? 'bg-custom-sage border-custom-sage text-white' 
                            : 'border-custom-border'
                        }`}>
                          {checkedSteps[idx] && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className={`text-xs font-medium leading-normal ${
                          checkedSteps[idx] 
                            ? 'line-through text-custom-soft-text font-normal' 
                            : 'text-custom-dark-text'
                        }`}>
                          {idx + 1}. {step}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setActivePlanTask(null)}
                    className="w-full bg-custom-sage hover:bg-custom-sage/95 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer mt-2"
                  >
                    Conquer This Task
                  </button>
                </div>
              )}

              {/* Error Content */}
              {!planLoading && aiPlanError && (
                <div className="flex flex-col items-center justify-center p-8 text-center gap-3 bg-[#FCF5F1] border border-[#F2D2C4] rounded-2xl">
                  <AlertTriangle size={32} className="text-custom-rust" />
                  <p className="text-sm font-semibold text-[#8C2C16] leading-tight">
                    {aiPlanError}
                  </p>
                  <p className="text-xs text-[#9B5B4C] max-w-sm mt-0.5">
                    Click Settings below to set your personal API key or verify your internet.
                  </p>
                  <button 
                    onClick={() => {
                      setActivePlanTask(null);
                      setActiveTab('Settings');
                    }}
                    className="mt-3 bg-[#C06B4A] hover:bg-[#A95939] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                  >
                    Go to Settings
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-custom-sidebar border-t border-custom-border dark:border-white/10 flex justify-around items-center z-40 px-2 shadow-lg pb-safe">
        {(() => {
          const bottomNavItems = [
            { name: 'Dashboard' as const, label: 'Home', icon: LayoutDashboard },
            { name: 'My Tasks' as const, label: 'Tasks', icon: CheckSquare },
            { name: 'AI Coach' as const, label: 'AI Coach', icon: Bot },
            { name: 'Schedule' as const, label: 'Calendar', icon: Calendar },
            { name: 'Settings' as const, label: 'Profile', icon: Settings },
          ];

          return bottomNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-all ${
                  isActive 
                    ? 'text-custom-sage font-semibold scale-105' 
                    : 'text-custom-soft-text hover:text-custom-dark-text dark:hover:text-white'
                }`}
                title={item.label}
              >
                <div className="relative">
                  <IconComponent size={20} className={isActive ? 'text-custom-sage stroke-[2.5px]' : 'text-custom-soft-text'} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          });
        })()}
      </nav>

      {/* MOBILE FAB MENU BACKDROP */}
      {isFabMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity duration-300"
          onClick={() => setIsFabMenuOpen(false)}
        />
      )}

      {/* MOBILE FLOATING ACTION BUTTON (FAB) & EXPANDABLE ACTIONS */}
      <div id="mobile-fab-container" className="md:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 select-none">
        {isFabMenuOpen && (
          <div className="flex flex-col items-end gap-2.5 animate-scale-up">
            {/* Action 1: New Task */}
            <button
              onClick={() => {
                setActiveTab('Dashboard');
                setIsFabMenuOpen(false);
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }, 100);
              }}
              className="flex items-center gap-2.5 bg-white dark:bg-custom-sidebar border border-custom-border dark:border-white/15 px-3.5 py-2 rounded-full shadow-md text-custom-dark-text dark:text-white cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase">New Task</span>
              <div className="w-8 h-8 rounded-full bg-custom-sage/10 text-custom-sage flex items-center justify-center">
                <CheckSquare size={14} />
              </div>
            </button>

            {/* Action 2: Quick Note */}
            <button
              onClick={() => {
                setActiveTab('AI Assistant');
                setIsFabMenuOpen(false);
              }}
              className="flex items-center gap-2.5 bg-white dark:bg-custom-sidebar border border-custom-border dark:border-white/15 px-3.5 py-2 rounded-full shadow-md text-custom-dark-text dark:text-white cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase">Quick Note</span>
              <div className="w-8 h-8 rounded-full bg-custom-sage/10 text-custom-sage flex items-center justify-center">
                <Sparkles size={14} />
              </div>
            </button>

            {/* Action 3: Reminder */}
            <button
              onClick={() => {
                setActiveTab('Reminders');
                setIsFabMenuOpen(false);
              }}
              className="flex items-center gap-2.5 bg-white dark:bg-custom-sidebar border border-custom-border dark:border-white/15 px-3.5 py-2 rounded-full shadow-md text-custom-dark-text dark:text-white cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase">Reminder</span>
              <div className="w-8 h-8 rounded-full bg-[#4A86E8]/10 text-[#4A86E8] flex items-center justify-center">
                <Bell size={14} />
              </div>
            </button>

            {/* Action 4: Voice Input */}
            <button
              onClick={() => {
                setIsFabMenuOpen(false);
                startSpeechRecognition();
              }}
              className="flex items-center gap-2.5 bg-white dark:bg-custom-sidebar border border-custom-border dark:border-white/15 px-3.5 py-2 rounded-full shadow-md text-custom-dark-text dark:text-white cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase">Voice Input</span>
              <div className="w-8 h-8 rounded-full bg-custom-rust/10 text-custom-rust flex items-center justify-center">
                <Mic size={14} />
              </div>
            </button>

            {/* Action 5: Life Goals */}
            <button
              onClick={() => {
                setActiveTab('Goals');
                setIsFabMenuOpen(false);
              }}
              className="flex items-center gap-2.5 bg-white dark:bg-custom-sidebar border border-custom-border dark:border-white/15 px-3.5 py-2 rounded-full shadow-md text-custom-dark-text dark:text-white cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase">Life Goals</span>
              <div className="w-8 h-8 rounded-full bg-custom-gold/10 text-custom-gold flex items-center justify-center">
                <Target size={14} className="text-amber-500" />
              </div>
            </button>

            {/* Action 6: Voice Profiles */}
            <button
              onClick={() => {
                setActiveTab('Voice Profiles');
                setIsFabMenuOpen(false);
              }}
              className="flex items-center gap-2.5 bg-white dark:bg-custom-sidebar border border-custom-border dark:border-white/15 px-3.5 py-2 rounded-full shadow-md text-custom-dark-text dark:text-white cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase">Voice Settings</span>
              <div className="w-8 h-8 rounded-full bg-custom-rust/10 text-custom-rust flex items-center justify-center">
                <Volume2 size={14} className="text-custom-rust" />
              </div>
            </button>
          </div>
        )}

        {/* Master FAB Trigger button */}
        <button
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform duration-300 ${
            isFabMenuOpen 
              ? 'bg-custom-rust text-white rotate-45 scale-110' 
              : 'bg-custom-sage hover:bg-custom-sage/90 text-white hover:scale-105'
          }`}
          title="Quick Actions Menu"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* CONGRATULATIONS BADGE UNLOCKED MODAL */}
      {unlockedBadgePopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full border border-custom-border shadow-[0_24px_60px_rgba(201,169,110,0.25)] relative overflow-hidden flex flex-col items-center text-center animate-scale-up">
            {/* Background ambient gold aura */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-custom-gold/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-custom-sage/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Pulsing Trophy Wrapper */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/10 to-[#C9A96E]/20 flex items-center justify-center border border-[#C9A96E]/40 shadow-[0_0_35px_rgba(201,169,110,0.4)] relative mb-6">
              <span className="text-5xl animate-bounce select-none">{unlockedBadgePopup.emoji}</span>
            </div>

            <span className="text-[10px] font-extrabold tracking-widest text-[#8C6B16] uppercase bg-[#FAF6EE] px-3 py-1 rounded-full border border-[#EAD393]/40">
              🏆 New Milestone Conquered!
            </span>

            <h3 className="font-serif font-light text-3xl text-custom-dark-text mt-4 leading-tight">
              {unlockedBadgePopup.name}
            </h3>

            <div className="w-12 h-0.5 bg-custom-gold/40 my-4 rounded-full" />

            <p className="font-serif italic text-sm text-custom-mid-text px-4 leading-relaxed bg-[#FAFAF9] py-3 rounded-xl border border-custom-border/50">
              "{unlockedBadgePopup.quoteOrDesc}"
            </p>

            <p className="text-xs text-custom-soft-text mt-4 max-w-xs leading-relaxed">
              Your discipline is forming an unbreakable system of momentum. This badge has been permanently inscribed in your <strong>Hall of Wins</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mt-8">
              <button
                onClick={() => {
                  const text = `🏆 I unlocked the "${unlockedBadgePopup.emoji} ${unlockedBadgePopup.name}" Badge on Kaivora!\n✨ "${unlockedBadgePopup.quoteOrDesc}"\n🔥 Current Streak: ${streakCount} Days!\n🚀 Track your life arenas and build legendary consistency.`;
                  navigator.clipboard.writeText(text);
                  showToast("📋 Copied achievement details to clipboard!", "success");
                }}
                className="bg-custom-bg border border-custom-border hover:bg-custom-bg/85 text-custom-dark-text font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 text-center flex items-center justify-center gap-1.5"
              >
                <span>🔗</span> Share Wins
              </button>
              <button
                onClick={() => {
                  setUnlockedBadgePopup(null);
                  showToast("⭐ Added permanently to your Hall of Wins!", "gold");
                }}
                className="bg-[#8C6B16] hover:bg-[#735711] text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 text-center"
              >
                Collect Badge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

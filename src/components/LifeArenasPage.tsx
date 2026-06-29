import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Check, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Calendar, 
  Heart, 
  Briefcase, 
  Activity, 
  DollarSign, 
  BookOpen, 
  X, 
  TrendingUp, 
  HelpCircle, 
  Star,
  CheckSquare,
  Square
} from 'lucide-react';

export interface Milestone {
  id: string;
  name: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  arenaId: string; // 'career' | 'mind' | 'health' | 'wealth' | 'relationships'
  title: string;
  targetDate: string;
  whyItMatters: string;
  milestones: Milestone[];
  completed: boolean;
  completedAt?: string;
}

export interface ArenaRating {
  arenaId: string;
  rating: number;
}

export interface WeeklyCheckIn {
  id: string;
  date: string;
  ratings: ArenaRating[];
  advice: string;
}

interface LifeArenasPageProps {
  userApiKey: string;
  showToast: (message: string, type: 'success' | 'error' | 'rust' | 'gold' | 'info') => void;
}

const ARENAS = [
  { id: 'career', name: 'Career', emoji: '💼', desc: 'professional growth', color: '#7C9A8A', bgAccent: 'rgba(124, 154, 138, 0.15)' },
  { id: 'mind', name: 'Mind', emoji: '🧠', desc: 'learning and skills', color: '#5B8296', bgAccent: 'rgba(91, 130, 150, 0.15)' },
  { id: 'health', name: 'Health', emoji: '💪', desc: 'fitness and wellness', color: '#C06B4A', bgAccent: 'rgba(192, 107, 74, 0.15)' },
  { id: 'wealth', name: 'Wealth', emoji: '💰', desc: 'financial goals', color: '#C9A96E', bgAccent: 'rgba(201, 169, 110, 0.15)' }
];

// Helper to format Date for weekly check-in keys
const getWeekKey = (date: Date) => {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
  return `${date.getFullYear()}-W${weekNumber}`;
};

// Helper for rendering circular progress rings
const CircularProgress = ({ percent, size = 60, strokeWidth = 5, color = '#7C9A8A', isMain = false }: { percent: number; size?: number; strokeWidth?: number; color?: string; isMain?: boolean }) => {
  const safePercent = isNaN(percent) || percent === undefined ? 0 : percent;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-custom-border/30 dark:text-custom-border/10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`${isMain ? 'text-3xl font-black font-sans text-custom-dark-text' : 'text-[11px] font-bold font-sans text-custom-dark-text'}`}>
          {Math.round(safePercent)}%
        </span>
        {isMain && <span className="text-[9px] font-bold uppercase tracking-wider text-custom-soft-text mt-0.5">balance</span>}
      </div>
    </div>
  );
};

export default function LifeArenasPage({ userApiKey, showToast }: LifeArenasPageProps) {
  // STATE MANAGEMENT
  const [goals, setGoals] = useState<Goal[]>(() => {
    const local = localStorage.getItem('kaivora_arena_goals');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (err) {
        console.error("Error parsing goals:", err);
      }
    }
    // Return default inspiring goals
    return [
      {
        id: 'g1',
        arenaId: 'career',
        title: "Secure senior leadership promotion",
        targetDate: "2026-12-15",
        whyItMatters: "To lead strategic projects and mentor junior colleagues in engineering.",
        milestones: [
          { id: 'm1-1', name: "Complete executive leadership training module", completed: true },
          { id: 'm1-2', name: "Present strategic Q3 growth roadmap", completed: false },
          { id: 'm1-3', name: "Schedule alignment sync with VP of Product", completed: false }
        ],
        completed: false
      },
      {
        id: 'g2',
        arenaId: 'mind',
        title: "Read 12 transformative non-fiction books",
        targetDate: "2026-12-31",
        whyItMatters: "To expand mental models, acquire new tools, and grow intellectually.",
        milestones: [
          { id: 'm2-1', name: "Finish reading 'Atomic Habits'", completed: true },
          { id: 'm2-2', name: "Finish reading 'Deep Work'", completed: false },
          { id: 'm2-3', name: "Set up weekly Sunday night reading ritual", completed: true }
        ],
        completed: false
      },
      {
        id: 'g3',
        arenaId: 'health',
        title: "Run a half marathon under 2 hours",
        targetDate: "2026-10-18",
        whyItMatters: "To achieve peak cardiovascular health and mental fortitude.",
        milestones: [
          { id: 'm3-1', name: "Establish a 15k base long run", completed: false },
          { id: 'm3-2', name: "Incorporate twice-weekly strength training", completed: true },
          { id: 'm3-3', name: "Finalize pacing strategy & race nutrition", completed: false }
        ],
        completed: false
      },
      {
        id: 'g4',
        arenaId: 'wealth',
        title: "Build 6-month emergency reserve fund",
        targetDate: "2026-11-30",
        whyItMatters: "To create absolute financial resilience and peace of mind.",
        milestones: [
          { id: 'm4-1', name: "Audit monthly fixed and variable expenses", completed: true },
          { id: 'm4-2', name: "Set up automated 15% savings transfer", completed: true },
          { id: 'm4-3', name: "Hit 75% of emergency fund target", completed: false }
        ],
        completed: false
      }
    ];
  });

  // Saving goals to localStorage
  useEffect(() => {
    localStorage.setItem('kaivora_arena_goals', JSON.stringify(goals));
  }, [goals]);

  // Selected expanded Arena
  const [expandedArena, setExpandedArena] = useState<string | null>(null);

  // New Goal Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalArena, setNewGoalArena] = useState<string>('career');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalWhy, setNewGoalWhy] = useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');
  const [newGoalMilestones, setNewGoalMilestones] = useState<string[]>(['']);

  // Confetti Animation State
  const [confetti, setConfetti] = useState<{ id: number; color: string; style: React.CSSProperties }[]>([]);
  const nextConfettiIdRef = useRef(0);

  // AI Advisor Advisor States
  const [advisorArena, setAdvisorArena] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorSuggestions, setAdvisorSuggestions] = useState<{ title: string; whyItMatters: string; milestones: string[] }[]>([]);
  const [advisorError, setAdvisorError] = useState<string | null>(null);

  // Weekly Goal Check-in States
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInRatings, setCheckInRatings] = useState<Record<string, number>>({
    career: 3,
    mind: 3,
    health: 3,
    wealth: 3
  });
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInAdvice, setCheckInAdvice] = useState<string>('');
  const [checkInHistory, setCheckInHistory] = useState<WeeklyCheckIn[]>(() => {
    const local = localStorage.getItem('kaivora_checkin_history');
    return local ? JSON.parse(local) : [];
  });

  // Save check-in history
  useEffect(() => {
    localStorage.setItem('kaivora_checkin_history', JSON.stringify(checkInHistory));
  }, [checkInHistory]);

  // Check if we should automatically trigger the check-in modal on Monday
  useEffect(() => {
    const today = new Date();
    const isMonday = today.getDay() === 1; // 1 = Monday
    if (isMonday) {
      const currentWeekKey = getWeekKey(today);
      const lastCheckInWeek = localStorage.getItem('kaivora_last_checkin_week');
      if (lastCheckInWeek !== currentWeekKey) {
        setShowCheckInModal(true);
      }
    }
  }, []);

  // CONFETTI ANIMATION TRIGGER
  const triggerConfetti = () => {
    const colors = ['#7C9A8A', '#5B8296', '#C06B4A', '#C9A96E', '#A18294', '#E8C4B4', '#A8C4B0'];
    const newConfetti = Array.from({ length: 85 }).map(() => {
      const id = nextConfettiIdRef.current++;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const xStart = Math.random() * 100; // viewport width %
      const size = Math.random() * 12 + 6; // px
      const delay = Math.random() * 0.8; // seconds
      const duration = Math.random() * 2 + 2.5; // seconds
      
      return {
        id,
        color,
        style: {
          left: `${xStart}vw`,
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          top: '-20px',
          position: 'fixed' as const,
          zIndex: 9999,
          pointerEvents: 'none' as const,
          '--confetti-delay': `${delay}s`,
          '--confetti-duration': `${duration}s`,
        } as React.CSSProperties
      };
    });

    setConfetti(newConfetti);
    // Clear after 4 seconds
    setTimeout(() => {
      setConfetti([]);
    }, 4500);
  };

  // HANDLE GOAL STATUS COMPLETION
  const toggleGoalComplete = (goalId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const nextCompleted = !g.completed;
        
        // If completing, play sound & confetti
        if (nextCompleted) {
          triggerConfetti();
          showToast("🎯 Goal conquered! Kaivora is proud of you!", "gold");
          
          // Also mark all milestones complete
          const updatedMilestones = g.milestones.map(m => ({ ...m, completed: true }));
          return {
            ...g,
            completed: true,
            completedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            milestones: updatedMilestones
          };
        } else {
          // If uncompleting, uncomplete milestones as well (or keep them)
          return {
            ...g,
            completed: false,
            completedAt: undefined
          };
        }
      }
      return g;
    }));
  };

  // TOGGLE INDIVIDUAL MILESTONE
  const toggleMilestone = (goalId: string, milestoneId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const updatedMilestones = g.milestones.map(m => {
          if (m.id === milestoneId) {
            return { ...m, completed: !m.completed };
          }
          return m;
        });

        // Check if all milestones are now completed
        const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.completed);
        const wasCompleted = g.completed;

        if (allDone && !wasCompleted) {
          triggerConfetti();
          showToast("🎯 Goal conquered! Kaivora is proud of you!", "gold");
          return {
            ...g,
            milestones: updatedMilestones,
            completed: true,
            completedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          };
        } else if (!allDone && wasCompleted) {
          return {
            ...g,
            milestones: updatedMilestones,
            completed: false,
            completedAt: undefined
          };
        }

        return {
          ...g,
          milestones: updatedMilestones
        };
      }
      return g;
    }));
  };

  // ADD NEW MILESTONE TO AN EXISTING GOAL
  const handleAddMilestoneToGoal = (goalId: string, name: string) => {
    if (!name.trim()) return;
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const newMilestone = {
          id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: name.trim(),
          completed: false
        };
        const updatedMilestones = [...g.milestones, newMilestone];
        return {
          ...g,
          milestones: updatedMilestones,
          completed: false // Reset completed status if a new unchecked milestone is added
        };
      }
      return g;
    }));
  };

  // DELETE MILESTONE FROM AN EXISTING GOAL
  const handleDeleteMilestoneFromGoal = (goalId: string, milestoneId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const updatedMilestones = g.milestones.filter(m => m.id !== milestoneId);
        const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.completed);
        return {
          ...g,
          milestones: updatedMilestones,
          completed: allDone
        };
      }
      return g;
    }));
  };

  // DELETE GOAL
  const handleDeleteGoal = (goalId: string) => {
    if (window.confirm("Are you sure you want to delete this goal?")) {
      setGoals(prev => prev.filter(g => g.id !== goalId));
      showToast("Goal removed", "info");
    }
  };

  // ADD GOAL FORM - SUBMIT
  const handleCreateGoal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newGoalTitle.trim()) {
      showToast("Please enter a goal title", "error");
      return;
    }

    const goalId = `g-${Date.now()}`;
    const filteredMilestones = newGoalMilestones
      .filter(m => m.trim() !== '')
      .map((m, idx) => ({
        id: `m-${goalId}-${idx}`,
        name: m.trim(),
        completed: false
      }));

    const newGoal: Goal = {
      id: goalId,
      arenaId: newGoalArena,
      title: newGoalTitle.trim(),
      targetDate: newGoalTargetDate || (() => {
        const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
      whyItMatters: newGoalWhy.trim() || "To cultivate balance and excellence in my life.",
      milestones: filteredMilestones,
      completed: false
    };

    setGoals(prev => [newGoal, ...prev]);
    showToast("🎯 Goal added successfully!", "success");

    // Reset Form
    setNewGoalTitle('');
    setNewGoalWhy('');
    setNewGoalTargetDate('');
    setNewGoalMilestones(['']);
    setShowAddModal(false);
  };

  // ADD INSTANT GOAL FROM SUGGESTIONS
  const handleAddSuggestedGoal = (arenaId: string, title: string, why: string, milestoneNames: string[]) => {
    const goalId = `g-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newGoal: Goal = {
      id: goalId,
      arenaId,
      title,
      whyItMatters: why,
      targetDate: (() => {
        const d = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
      milestones: milestoneNames.map((name, i) => ({
        id: `m-${goalId}-${i}`,
        name,
        completed: false
      })),
      completed: false
    };

    setGoals(prev => [newGoal, ...prev]);
    showToast(`🎯 Added: "${title}"`, "success");
  };

  // CALL AI ADVISOR FOR SUGGESTIONS
  const handleAskAdvisor = async (arenaId: string) => {
    setAdvisorArena(arenaId);
    setAdvisorLoading(true);
    setAdvisorError(null);
    setAdvisorSuggestions([]);

    const arenaName = ARENAS.find(a => a.id === arenaId)?.name || arenaId;
    const currentArenaGoals = goals.filter(g => g.arenaId === arenaId).map(g => g.title).join(', ');

    const prompt = `You are a life coach. The user wants to improve their life arena: "${arenaName}". Their current goals are [${currentArenaGoals || "No active goals in this arena"}]. Give them 3 specific actionable goals they should add with clear milestones. Be inspiring and realistic. Return your response STRICTLY as a raw JSON array of objects, and absolutely nothing else. Do not wrap in markdown or return preambles. Each object MUST follow this structure: 
    [
      {
        "title": "A short inspiring goal",
        "whyItMatters": "A 1-sentence motivation of why this matters",
        "milestones": ["Milestone step 1", "Milestone step 2", "Milestone step 3"]
      }
    ]`;

    try {
      const response = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          taskName: arenaName,
          customPrompt: prompt,
          userApiKey: userApiKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with AI Coach.");
      }

      let parsedSuggestions = [];
      let rawText = data.plan || '';
      
      // Clean possible Markdown JSON code block wrappers
      if (rawText.trim().startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      try {
        parsedSuggestions = JSON.parse(rawText);
      } catch (err) {
        console.error("Error parsing advisor JSON directly:", err);
        // Fallback simple regex extraction if AI added surrounding fluff
        const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          parsedSuggestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse advice format. Please try again.");
        }
      }

      setAdvisorSuggestions(parsedSuggestions);
    } catch (err: any) {
      console.error(err);
      setAdvisorError(err.message || "Could not retrieve recommendations. Please check your internet or API key.");
    } finally {
      setAdvisorLoading(false);
    }
  };

  // WEEKLY CHECK-IN: SUBMIT RATINGS & GENERATE ADVICE
  const handleSubmitCheckIn = async () => {
    setCheckInLoading(true);
    setCheckInAdvice('');

    const scoresString = Object.entries(checkInRatings)
      .map(([key, rating]) => `${ARENAS.find(a => a.id === key)?.name || key}: ${rating}/5`)
      .join(', ');

    const prompt = `You are Kaivora, a warm and deeply insightful life coach. The user has completed their weekly check-in rating their life arenas as follows: ${scoresString}. Analyze their balance score, identify which area needs attention, and give them a highly motivating, exactly 3-sentence personalized weekly advice. Be encouraging, realistic, and focused on harmony and balance. Do not include markdown headers or lists, return exactly 3 beautiful cohesive sentences.`;

    try {
      const response = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': userApiKey
        },
        body: JSON.stringify({
          taskName: "Weekly Check-in",
          customPrompt: prompt,
          userApiKey: userApiKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate weekly advice.");
      }

      const advice = data.plan || "Keep striving for dynamic balance across all arenas. Focus on incremental habits each day.";
      setCheckInAdvice(advice);

      // Save check-in
      const ratingsArray = Object.entries(checkInRatings).map(([arenaId, rating]) => ({ arenaId, rating: rating as number }));
      const newCheckIn: WeeklyCheckIn = {
        id: `checkin-${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        ratings: ratingsArray,
        advice: advice
      };

      setCheckInHistory(prev => [newCheckIn, ...prev]);
      
      // Update last shown check-in week in localStorage
      const currentWeekKey = getWeekKey(new Date());
      localStorage.setItem('kaivora_last_checkin_week', currentWeekKey);
      
      showToast("🎯 Weekly Check-in complete! Advice unlocked.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Check-in succeeded but AI advice failed. Check your API key.", "error");
      setCheckInAdvice("Your weekly rankings are logged. Ensure your Gemini API Key is configured in settings to receive tailored Kaivora coaching.");
    } finally {
      setCheckInLoading(false);
    }
  };

  // CALCULATE SCORE AND STATS
  const calculateArenaScore = (arenaId: string) => {
    const arenaGoals = goals.filter(g => g.arenaId === arenaId && !g.completed);
    const completedGoals = goals.filter(g => g.arenaId === arenaId && g.completed);
    const totalGoalsInArena = arenaGoals.length + completedGoals.length;
    
    if (totalGoalsInArena === 0) return 0;

    // Weight: completed goals are 100%. For uncompleted goals, weight them by milestone percentage
    let totalScore = completedGoals.length * 100;
    
    arenaGoals.forEach(g => {
      if (g.milestones.length === 0) {
        // If no milestones, is either 0 or 100% (and it's not completed, so 0)
        totalScore += 0;
      } else {
        const completedMilestonesCount = g.milestones.filter(m => m.completed).length;
        const progressPct = (completedMilestonesCount / g.milestones.length) * 100;
        totalScore += progressPct;
      }
    });

    return totalScore / totalGoalsInArena;
  };

  const getArenaGoalCount = (arenaId: string) => {
    return goals.filter(g => g.arenaId === arenaId).length;
  };

  const getArenaMostUrgentGoal = (arenaId: string) => {
    const arenaGoals = goals.filter(g => g.arenaId === arenaId && !g.completed);
    if (arenaGoals.length === 0) return null;
    
    // Sort by target date ascending (soonest first)
    return arenaGoals.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0];
  };

  // Overall Score (average of 5 arena scores)
  const overallScore = ARENAS.reduce((sum, arena) => sum + calculateArenaScore(arena.id), 0) / ARENAS.length;

  // Active Goals (uncompleted)
  const activeGoals = goals.filter(g => !g.completed);
  // Completed Goals (completed)
  const completedGoals = goals.filter(g => g.completed);

  // Add milestone input state helper
  const [newMilestoneInputText, setNewMilestoneInputText] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-16 animate-fade-in relative">
      
      {/* CONFETTI CONTAINER */}
      {confetti.map((conf) => (
        <div 
          key={conf.id} 
          style={conf.style} 
          className="animate-confetti-fall"
        />
      ))}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-serif font-light text-3xl sm:text-4xl text-custom-dark-text tracking-tight">Your Life Arenas</h2>
          <p className="text-custom-soft-text text-sm sm:text-base mt-1">What are you building towards? Nurture balanced mastery.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewGoalArena('career');
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-custom-sage hover:bg-custom-sage/95 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full shadow-sm cursor-pointer transition-all"
          >
            <Plus size={16} /> New Goal
          </button>
          <button
            onClick={() => setShowCheckInModal(true)}
            className="flex items-center gap-2 bg-custom-card-sec border border-custom-border hover:bg-custom-border text-custom-dark-text text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full cursor-pointer transition-all"
          >
            🎯 Weekly Check-In
          </button>
        </div>
      </div>

      {/* OVERALL COMPASS DASHBOARD */}
      <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-custom-border shadow-sm flex flex-col gap-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full">
          
          {/* Big overall score ring in center */}
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-custom-soft-text">Life Balance Compass</span>
            <CircularProgress percent={overallScore} size={150} strokeWidth={9} color="#7C9A8A" isMain />
            <div className="flex flex-col gap-1">
              <p className="font-serif italic text-custom-mid-text text-sm mt-1">"A balanced life is a powerful life"</p>
              <span className="text-[10px] text-custom-soft-text font-mono font-medium uppercase">Kaivora Philosophy</span>
            </div>
          </div>

          {/* Compass layout on Desktop */}
          <div className="hidden md:block relative w-[320px] h-[320px] shrink-0 border border-dashed border-custom-border/80 rounded-full bg-custom-bg/10">
            {/* Center reference point lines */}
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-custom-border/30 pointer-events-none" />
            <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-custom-border/30 pointer-events-none" />
            
            {/* 12 O'clock - Career (North) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setExpandedArena(expandedArena === 'career' ? null : 'career')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-custom-border group-hover:scale-105 transition-all">💼</div>
              <span className="text-[9px] font-bold text-custom-soft-text uppercase">Career</span>
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#7C9A8A' }} />
            </div>

            {/* 3 O'clock - Mind (East) */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setExpandedArena(expandedArena === 'mind' ? null : 'mind')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-custom-border group-hover:scale-105 transition-all">🧠</div>
              <span className="text-[9px] font-bold text-custom-soft-text uppercase">Mind</span>
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#5B8296' }} />
            </div>

            {/* 6 O'clock - Wealth (South) */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setExpandedArena(expandedArena === 'wealth' ? null : 'wealth')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-custom-border group-hover:scale-105 transition-all">💰</div>
              <span className="text-[9px] font-bold text-custom-soft-text uppercase">Wealth</span>
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#C9A96E' }} />
            </div>

            {/* 9 O'clock - Health (West) */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setExpandedArena(expandedArena === 'health' ? null : 'health')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-custom-border group-hover:scale-105 transition-all">💪</div>
              <span className="text-[9px] font-bold text-custom-soft-text uppercase">Health</span>
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#C06B4A' }} />
            </div>

            {/* Miniature circular compass inside */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/70 backdrop-blur-xs p-1.5 rounded-full border border-custom-border shadow-sm pointer-events-none text-[10px] font-serif font-medium text-custom-sage tracking-widest select-none animate-pulse">
              MASTER
            </div>
          </div>

          {/* Fallback mini-compass grid for Mobile */}
          <div className="grid grid-cols-4 gap-3 w-full max-w-lg md:hidden border-t border-custom-border/50 pt-6">
            {ARENAS.map(arena => {
              const score = calculateArenaScore(arena.id);
              return (
                <div 
                  key={arena.id} 
                  onClick={() => setExpandedArena(expandedArena === arena.id ? null : arena.id)}
                  className="flex flex-col items-center gap-2 text-center py-2 px-1 rounded-xl bg-custom-bg/10 hover:bg-custom-bg/25 border border-custom-border/40 transition-all cursor-pointer"
                >
                  <span className="text-xl leading-none">{arena.emoji}</span>
                  <span className="text-[8px] font-extrabold tracking-wider text-custom-soft-text uppercase truncate w-full">{arena.name}</span>
                  <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: arena.color }} />
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* LIFE ARENAS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ARENAS.map((arena) => {
          const score = calculateArenaScore(arena.id);
          const goalCount = getArenaGoalCount(arena.id);
          const urgentGoal = getArenaMostUrgentGoal(arena.id);
          const isExpanded = expandedArena === arena.id;

          return (
            <div 
              key={arena.id}
              className={`bg-white rounded-[20px] p-5 border shadow-xs transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden cursor-pointer group ${
                isExpanded ? 'border-2 scale-[1.01]' : 'border-custom-border hover:shadow-md'
              }`}
              style={{ borderLeftColor: arena.color, borderLeftWidth: '5px' }}
              onClick={() => setExpandedArena(isExpanded ? null : arena.id)}
            >
              {/* Card top info */}
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl select-none leading-none">{arena.emoji}</span>
                    <h3 className="font-serif font-medium text-lg text-custom-dark-text">{arena.name}</h3>
                  </div>
                  <span className="text-[10px] font-bold text-custom-soft-text tracking-wider uppercase">{arena.desc}</span>
                </div>
                <CircularProgress percent={score} size={44} strokeWidth={4} color={arena.color} />
              </div>

              {/* Center status - goals list quantity */}
              <div className="my-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-custom-dark-text font-sans">{goalCount}</span>
                  <span className="text-xs text-custom-soft-text">active goals</span>
                </div>
                {/* One line urgent goal summary */}
                <div className="mt-2 text-xs truncate max-w-full">
                  {urgentGoal ? (
                    <span className="text-custom-mid-text flex items-center gap-1">
                      <span className="text-amber-600 font-mono">⌛</span> 
                      <span className="font-medium underline decoration-dotted decoration-custom-soft-text">{urgentGoal.title}</span>
                    </span>
                  ) : (
                    <span className="text-custom-soft-text italic">No pending goals</span>
                  )}
                </div>
              </div>

              {/* Bottom trigger action */}
              <div className="flex justify-between items-center border-t border-custom-border/40 pt-3 mt-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-custom-soft-text group-hover:text-custom-dark-text transition-colors">
                  {isExpanded ? 'Collapse Details' : 'Expand Arena'}
                </span>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-custom-soft-text group-hover:text-custom-dark-text transition-all" />
                ) : (
                  <ChevronDown size={16} className="text-custom-soft-text group-hover:text-custom-dark-text transition-all" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* EXPANDED LIFE ARENA DETAILED WORKSPACE */}
      {expandedArena && (() => {
        const arena = ARENAS.find(a => a.id === expandedArena)!;
        const arenaGoals = goals.filter(g => g.arenaId === expandedArena && !g.completed);
        const score = calculateArenaScore(arena.id);

        return (
          <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-custom-border shadow-sm flex flex-col gap-6 animate-scale-up">
            
            {/* Header of workspace */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-custom-border/60 pb-5 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl p-2 rounded-2xl" style={{ backgroundColor: arena.bgAccent }}>
                  {arena.emoji}
                </span>
                <div>
                  <h3 className="font-serif font-light text-2xl text-custom-dark-text flex items-center gap-2">
                    {arena.name} Workspace
                  </h3>
                  <p className="text-custom-soft-text text-xs mt-0.5 font-sans uppercase font-bold tracking-wider">
                    Arena Metrics: {arenaGoals.length} Active • {Math.round(score)}% Complete
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNewGoalArena(arena.id);
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-custom-bg hover:bg-custom-card-sec text-custom-dark-text border border-custom-border text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-full cursor-pointer transition-all"
                >
                  <Plus size={14} /> Add Goal
                </button>
                <button
                  onClick={() => handleAskAdvisor(arena.id)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-custom-sage-light/10 to-[#C9A96E]/10 hover:from-custom-sage-light/20 hover:to-[#C9A96E]/20 text-custom-dark-text border border-custom-sage/30 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-full cursor-pointer transition-all"
                  disabled={advisorLoading}
                >
                  <Sparkles size={14} className="text-custom-sage animate-pulse" /> 
                  {advisorLoading ? 'Coaching...' : 'Ask Kaivora'}
                </button>
              </div>
            </div>

            {/* AI Advisor Panel (if open or loading) */}
            {(advisorArena === arena.id && (advisorLoading || advisorSuggestions.length > 0 || advisorError)) && (
              <div className="bg-custom-bg/50 border border-custom-border/80 rounded-2xl p-5 flex flex-col gap-4 animate-scale-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-custom-dark-text">
                    <Sparkles className="text-custom-gold shrink-0" size={18} />
                    <h4 className="font-serif text-base font-semibold">Kaivora's Strategic Arena Suggestions</h4>
                  </div>
                  <button 
                    onClick={() => {
                      setAdvisorArena(null);
                      setAdvisorSuggestions([]);
                    }}
                    className="p-1 hover:bg-custom-border rounded-full text-custom-soft-text hover:text-custom-dark-text cursor-pointer transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                {advisorLoading && (
                  <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-10 h-10 border-4 border-custom-sage border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-custom-soft-text font-medium uppercase tracking-wider animate-pulse">Consulting the Kaivora AI Life Coach...</p>
                  </div>
                )}

                {advisorError && (
                  <div className="p-3.5 bg-red-50/50 border border-red-200/50 text-slate-950 dark:text-slate-100 text-xs rounded-xl flex items-center gap-2 font-semibold">
                    <span>⚠️</span> {advisorError}
                  </div>
                )}

                {!advisorLoading && advisorSuggestions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {advisorSuggestions.map((sug, idx) => (
                      <div key={idx} className="bg-white border border-custom-border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-all relative">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-custom-sage uppercase tracking-wider">Insight {idx + 1}</span>
                            <span className="text-xs">🤖</span>
                          </div>
                          <h5 className="font-sans font-bold text-sm text-custom-dark-text">{sug.title}</h5>
                          <p className="text-xs text-custom-soft-text mt-1 italic">"{sug.whyItMatters}"</p>
                          
                          {sug.milestones && sug.milestones.length > 0 && (
                            <div className="mt-3 border-t border-custom-border/40 pt-2.5">
                              <span className="text-[9px] font-bold text-custom-mid-text uppercase tracking-wider block mb-1">Recommended Milestones:</span>
                              <ul className="text-xs text-custom-mid-text space-y-1.5 pl-3 list-disc">
                                {sug.milestones.map((ms, i) => (
                                  <li key={i}>{ms}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleAddSuggestedGoal(arena.id, sug.title, sug.whyItMatters, sug.milestones)}
                          className="mt-3 w-full bg-custom-sage hover:bg-custom-sage/95 text-white py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1"
                        >
                          <Plus size={12} /> Add This Goal
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* List of goals in this arena */}
            {arenaGoals.length === 0 ? (
              <div className="py-12 border border-dashed border-custom-border rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                <span className="text-3xl select-none">🎯</span>
                <div>
                  <h4 className="font-serif text-lg text-custom-dark-text">No active goals in {arena.name}</h4>
                  <p className="text-custom-soft-text text-xs max-w-sm mx-auto mt-1">
                    Establish a path of victory. Create a custom goal or ask Kaivora for strategic guidance.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {arenaGoals.map((goal) => {
                  const completedMilestones = goal.milestones.filter(m => m.completed).length;
                  const totalMilestones = goal.milestones.length;
                  const progressPct = totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);

                  // Unique local state for inline milestone addition input
                  const inputValue = newMilestoneInputText[goal.id] || '';

                  return (
                    <div 
                      key={goal.id} 
                      className="border border-custom-border rounded-2xl bg-custom-bg/15 p-5 sm:p-6 flex flex-col gap-4 hover:shadow-xs transition-all relative overflow-hidden group"
                    >
                      {/* Left border indicator */}
                      <div className="absolute top-0 bottom-0 left-0 w-1" style={{ backgroundColor: arena.color }} />

                      {/* Goal Title / Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2.5">
                            <button 
                              onClick={() => toggleGoalComplete(goal.id)}
                              className="text-custom-soft-text hover:text-custom-sage transition-all focus:outline-none cursor-pointer"
                              title="Mark whole goal complete"
                            >
                              <Square size={20} className="stroke-custom-soft-text" />
                            </button>
                            <h4 className="font-sans font-bold text-base sm:text-lg text-custom-dark-text tracking-tight group-hover:text-custom-sage transition-colors">
                              {goal.title}
                            </h4>
                          </div>
                          <p className="text-xs text-custom-soft-text pl-7 italic">
                            "Why: {goal.whyItMatters}"
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3 self-end sm:self-start shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-custom-mid-text bg-white border border-custom-border/80 px-3 py-1 rounded-full font-mono select-none">
                            <Calendar size={12} className="text-custom-soft-text" />
                            <span>Due: {goal.targetDate}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1 text-custom-soft-text hover:text-custom-rust hover:bg-custom-rust-light/10 rounded-lg transition-all cursor-pointer"
                            title="Delete Goal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Goal Milestone Progress Bar */}
                      <div className="pl-7">
                        <div className="flex justify-between items-center text-[10px] font-bold text-custom-soft-text uppercase tracking-wider mb-1.5">
                          <span>Milestones progress</span>
                          <span>{completedMilestones}/{totalMilestones} ({progressPct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-custom-border/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{ 
                              width: `${progressPct}%`,
                              backgroundColor: arena.color 
                            }}
                          />
                        </div>
                      </div>

                      {/* Sub-tasks / Milestones list */}
                      <div className="pl-7 flex flex-col gap-2.5 border-t border-custom-border/40 pt-4 mt-2">
                        <span className="text-[10px] font-bold text-custom-mid-text uppercase tracking-wider block mb-1">
                          Sub-tasks & Milestones
                        </span>
                        
                        {goal.milestones.length === 0 ? (
                          <p className="text-xs text-custom-soft-text italic py-1">No milestones defined yet. Add one below!</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {goal.milestones.map((ms) => (
                              <div 
                                key={ms.id} 
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                                  ms.completed 
                                    ? 'bg-custom-sage-light/10 border-custom-sage/30 text-custom-mid-text line-through' 
                                    : 'bg-white border-custom-border text-custom-dark-text'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleMilestone(goal.id, ms.id)}
                                    className="focus:outline-none cursor-pointer"
                                  >
                                    {ms.completed ? (
                                      <CheckSquare size={16} className="text-custom-sage" />
                                    ) : (
                                      <Square size={16} className="text-custom-soft-text" />
                                    )}
                                  </button>
                                  <span>{ms.name}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteMilestoneFromGoal(goal.id, ms.id)}
                                  className="text-custom-soft-text hover:text-custom-rust p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-custom-bg rounded-md transition-all cursor-pointer"
                                  title="Remove Milestone"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Quick Add Milestone Input */}
                        <div className="flex items-center gap-2 mt-2 max-w-md">
                          <input 
                            type="text"
                            placeholder="Add sub-task/milestone..."
                            value={inputValue}
                            onChange={(e) => {
                              const txt = e.target.value;
                              setNewMilestoneInputText(prev => ({ ...prev, [goal.id]: txt }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddMilestoneToGoal(goal.id, inputValue);
                                setNewMilestoneInputText(prev => ({ ...prev, [goal.id]: '' }));
                              }
                            }}
                            className="flex-1 bg-white border border-custom-border rounded-xl px-3 py-1.5 text-xs outline-none text-custom-dark-text focus:border-custom-sage transition-all"
                          />
                          <button
                            onClick={() => {
                              handleAddMilestoneToGoal(goal.id, inputValue);
                              setNewMilestoneInputText(prev => ({ ...prev, [goal.id]: '' }));
                            }}
                            className="bg-custom-sage hover:bg-custom-sage/90 text-white p-1.5 rounded-xl cursor-pointer transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        );
      })()}

      {/* HALL OF WINS SECTION (COMPLETED GOALS) */}
      <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-custom-border shadow-sm flex flex-col gap-6">
        <div>
          <h3 className="font-serif font-light text-2xl text-custom-dark-text flex items-center gap-2">
            🏆 The Hall of Wins
          </h3>
          <p className="text-custom-soft-text text-sm mt-0.5">Your fully complete, legendary milestone conquests.</p>
        </div>

        {completedGoals.length === 0 ? (
          <div className="py-12 border border-dashed border-custom-border rounded-2xl text-center flex flex-col items-center justify-center gap-3 bg-custom-bg/5">
            <span className="text-4xl filter grayscale">🎖️</span>
            <div>
              <h4 className="font-serif text-base text-custom-soft-text">The Hall stands waiting...</h4>
              <p className="text-custom-soft-text text-xs mt-1">Conquer goals to permanently etch your achievements in the Hall of Wins.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedGoals.map((goal) => {
              const arena = ARENAS.find(a => a.id === goal.arenaId)!;
              return (
                <div 
                  key={goal.id} 
                  className="bg-custom-bg/20 border border-custom-gold/40 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all relative group"
                  style={{ boxShadow: '0 0 15px rgba(201, 169, 110, 0.08)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl select-none leading-none">{arena.emoji}</span>
                      <div>
                        <h4 className="font-sans font-bold text-sm text-custom-dark-text tracking-tight flex items-center gap-1.5">
                          {goal.title} <span className="text-custom-gold select-none">✦</span>
                        </h4>
                        <span className="text-[9px] font-bold text-custom-soft-text uppercase tracking-widest">{arena.name} Arena</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 text-custom-soft-text hover:text-custom-rust transition-colors cursor-pointer"
                      title="Remove permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <p className="text-xs text-custom-soft-text italic leading-relaxed">
                    "{goal.whyItMatters}"
                  </p>

                  <div className="flex justify-between items-center border-t border-custom-border/40 pt-3 mt-1">
                    <span className="text-[10px] font-bold text-custom-sage flex items-center gap-1">
                      ✓ Conquered
                    </span>
                    <span className="text-[9px] font-mono text-custom-soft-text">
                      Ended: {goal.completedAt || 'Recently'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WEEKLY CHECK-IN POPUP MODAL */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-custom-sidebar/85 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[24px] border border-custom-border w-full max-w-xl p-6 sm:p-8 shadow-2xl relative flex flex-col gap-6 my-auto animate-scale-up max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => {
                setShowCheckInModal(false);
                setCheckInAdvice('');
              }}
              className="absolute top-6 right-6 text-custom-soft-text hover:text-custom-dark-text bg-custom-card-sec hover:bg-custom-border p-2 rounded-full transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 border-b border-custom-border/50 pb-4">
              <span className="text-4xl p-2 bg-[#FAF2EE] rounded-2xl select-none shadow-sm">🎯</span>
              <div>
                <h3 className="font-serif font-light text-2xl text-custom-dark-text">Weekly Goal Check-In</h3>
                <p className="text-custom-soft-text text-xs mt-0.5">Evaluate how your arenas performed last week.</p>
              </div>
            </div>

            {/* Assessment sliders */}
            {!checkInAdvice && (
              <div className="flex flex-col gap-5">
                <p className="text-xs text-custom-soft-text leading-relaxed">
                  Rate each Life Arena from **1 (Needs emergency attention)** to **5 (Flowing and fully mastered)** based on your efforts and results last week.
                </p>
                
                <div className="flex flex-col gap-4">
                  {ARENAS.map(arena => (
                    <div key={arena.id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-custom-bg/15 border border-custom-border/60">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none select-none">{arena.emoji}</span>
                          <span className="text-xs font-bold text-custom-dark-text">{arena.name}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-custom-sage bg-white border border-custom-border px-2 py-0.5 rounded-md">
                          {checkInRatings[arena.id]} / 5
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={checkInRatings[arena.id]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setCheckInRatings(prev => ({ ...prev, [arena.id]: val }));
                        }}
                        className="w-full accent-custom-sage cursor-pointer h-1 bg-custom-border/70 rounded-full"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubmitCheckIn}
                  className="w-full bg-custom-sage hover:bg-custom-sage/95 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2"
                  disabled={checkInLoading}
                >
                  <Sparkles size={14} className="animate-pulse" />
                  {checkInLoading ? 'Calculating Balance...' : 'Lock ratings & Get Coach advice'}
                </button>
              </div>
            )}

            {/* Advice parchment display */}
            {checkInAdvice && (
              <div className="flex flex-col gap-5 animate-scale-up">
                
                {checkInLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-3 border-custom-sage border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-custom-soft-text uppercase font-bold tracking-wider">Generating Advice...</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E9DCC8] shadow-inner text-center relative overflow-hidden">
                      {/* Decorative elements */}
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-custom-gold" />
                      <div className="text-2xl mb-1.5 select-none">📜</div>
                      <h4 className="font-serif italic text-base text-amber-900 font-semibold mb-2">Kaivora's Weekly Counsel</h4>
                      <p className="text-xs text-amber-950 font-sans leading-relaxed text-left indent-4">
                        {checkInAdvice}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-widest block">History of ratings logged</span>
                      <div className="flex gap-2.5 items-center justify-center py-2 bg-custom-bg/10 border border-custom-border/40 rounded-xl">
                        {ARENAS.map(arena => (
                          <div key={arena.id} className="flex items-center gap-1">
                            <span className="text-xs">{arena.emoji}</span>
                            <span className="text-xs font-bold text-custom-dark-text">{checkInRatings[arena.id]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowCheckInModal(false);
                        setCheckInAdvice('');
                      }}
                      className="w-full bg-custom-sidebar text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all mt-2"
                    >
                      Close Weekly Report
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* CREATE GOAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-custom-sidebar/85 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <form 
            onSubmit={handleCreateGoal}
            className="bg-white rounded-[24px] border border-custom-border w-full max-w-lg p-6 sm:p-8 shadow-2xl relative flex flex-col gap-5 my-auto animate-scale-up max-h-[95vh] overflow-y-auto"
          >
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-custom-soft-text hover:text-custom-dark-text bg-custom-card-sec hover:bg-custom-border p-2 rounded-full transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="font-serif font-light text-2xl text-custom-dark-text">Set Life Arena Goal</h3>
              <p className="text-custom-soft-text text-xs mt-0.5">Carve a path toward complete life mastery.</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Arena Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Life Arena</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ARENAS.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setNewGoalArena(a.id)}
                      className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        newGoalArena === a.id 
                          ? 'border-2 font-bold scale-[1.03]' 
                          : 'border-custom-border hover:bg-custom-bg/15 text-custom-soft-text'
                      }`}
                      style={{ 
                        borderColor: newGoalArena === a.id ? a.color : '',
                        color: newGoalArena === a.id ? 'var(--color-custom-dark-text)' : ''
                      }}
                    >
                      <span className="text-xl select-none leading-none">{a.emoji}</span>
                      <span className="text-[8px] uppercase tracking-wider truncate w-full">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Goal Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Run a half marathon under 2 hrs"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="bg-white border border-custom-border rounded-xl px-4 py-2.5 text-sm outline-none text-custom-dark-text focus:border-custom-sage transition-all"
                />
              </div>

              {/* Why it Matters (Motivation) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Why It Matters (Motivation)</label>
                <textarea 
                  placeholder="e.g. To achieve peak cardiovascular health and mental fortitude."
                  value={newGoalWhy}
                  onChange={(e) => setNewGoalWhy(e.target.value)}
                  rows={2}
                  className="bg-white border border-custom-border rounded-xl px-4 py-2.5 text-sm outline-none text-custom-dark-text focus:border-custom-sage transition-all resize-none"
                />
              </div>

              {/* Target Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Target Accomplishment Date</label>
                <input 
                  type="date"
                  value={newGoalTargetDate}
                  onChange={(e) => setNewGoalTargetDate(e.target.value)}
                  className="bg-white border border-custom-border rounded-xl px-4 py-2.5 text-sm outline-none text-custom-dark-text focus:border-custom-sage transition-all cursor-pointer"
                />
              </div>

              {/* Initial Milestones */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-custom-soft-text uppercase tracking-wider">Sub-tasks / Milestones</label>
                  <button
                    type="button"
                    onClick={() => setNewGoalMilestones(prev => [...prev, ''])}
                    className="text-custom-sage hover:text-custom-sage-light text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>
                
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {newGoalMilestones.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder={`Step ${idx + 1}...`}
                        value={m}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewGoalMilestones(prev => prev.map((item, i) => i === idx ? val : item));
                        }}
                        className="flex-1 bg-white border border-custom-border rounded-xl px-3 py-1.5 text-xs outline-none text-custom-dark-text focus:border-custom-sage transition-all"
                      />
                      {newGoalMilestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewGoalMilestones(prev => prev.filter((_, i) => i !== idx))}
                          className="text-custom-soft-text hover:text-custom-rust p-1 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <button
              type="submit"
              className="mt-2 w-full bg-custom-sage hover:bg-custom-sage/95 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all shadow-sm text-center"
            >
              Add Goal to {ARENAS.find(a => a.id === newGoalArena)?.name}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Play, 
  Trash2, 
  Plus, 
  X, 
  Loader2, 
  Check, 
  Volume2, 
  VolumeX 
} from 'lucide-react';

export interface VoiceProfile {
  id: string;
  name: string;
  emoji: string;
  isDefault?: boolean;
  audioBase64?: string; // Stored voice data in Base64
}

interface VoiceProfilesPageProps {
  voiceProfiles: VoiceProfile[];
  setVoiceProfiles: React.Dispatch<React.SetStateAction<VoiceProfile[]>>;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'rust') => void;
}

export default function VoiceProfilesPage({ 
  voiceProfiles, 
  setVoiceProfiles, 
  showToast 
}: VoiceProfilesPageProps) {
  // Modal & Recording states
  const [activeRecordProfile, setActiveRecordProfile] = useState<VoiceProfile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  
  // Custom profile states
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🎙️');

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Suggested emojis for custom profiles
  const emojiSuggestions = ['🎙️', '🤖', '🦊', '🦉', '🦁', '⭐', '🔥', '💖', '🎵', '💼', '🚀'];

  // Timer effect during recording
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Handle play preview state transitions
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Start recording voice
  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioPreview(null);
    setIsPlayingPreview(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioPreview(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks to release the mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start(250); // Small interval for chunks
      setIsRecording(true);
      showToast("🔴 Recording started... Speak clearly!", "rust");
    } catch (err: any) {
      console.error("Mic access failed", err);
      showToast("Microphone access denied or not supported.", "error");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      showToast("Recording stopped. Preview your voice below!", "success");
    }
  };

  // Playback preview
  const togglePlayPreview = () => {
    if (!audioPreview) return;

    if (isPlayingPreview) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      const audio = new Audio(audioPreview);
      audioPreviewRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingPreview(false);
      };

      audio.play().catch((err) => {
        console.error("Error playing audio", err);
        setIsPlayingPreview(false);
      });
    }
  };

  // Save voice to profile
  const saveProfileVoice = () => {
    if (!activeRecordProfile || !audioPreview) return;

    setVoiceProfiles((prev) =>
      prev.map((p) =>
        p.id === activeRecordProfile.id
          ? { ...p, audioBase64: audioPreview }
          : p
      )
    );

    showToast(`Voice profile for "${activeRecordProfile.name}" saved successfully!`, "success");
    setActiveRecordProfile(null);
    setAudioPreview(null);
  };

  // Delete recorded voice
  const deleteProfileVoice = (profileId: string, profileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the recorded voice for "${profileName}"?`)) return;

    setVoiceProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? { ...p, audioBase64: undefined }
          : p
      )
    );
    showToast(`Deleted voice recording for "${profileName}".`, "info");
  };

  // Add Custom Profile
  const handleAddCustomProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      showToast("Please enter a name for the profile.", "error");
      return;
    }

    // Check if custom profiles count exceeds limit (user asked for 5th custom profile)
    if (voiceProfiles.length >= 5) {
      showToast("Maximum of 5 voice profiles allowed.", "error");
      return;
    }

    const newProfile: VoiceProfile = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      emoji: customEmoji,
      isDefault: false,
    };

    setVoiceProfiles((prev) => [...prev, newProfile]);
    setCustomName('');
    setCustomEmoji('🎙️');
    setIsAddingCustom(false);
    showToast(`Custom profile "${newProfile.name}" added successfully!`, "success");
  };

  // Delete entire custom profile
  const handleDeleteCustomProfile = (profileId: string, profileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to completely delete "${profileName}" profile?`)) return;

    setVoiceProfiles((prev) => prev.filter((p) => p.id !== profileId));
    showToast(`Deleted custom profile "${profileName}".`, "info");
  };

  return (
    <div className="bg-white rounded-[24px] p-8 border border-custom-border shadow-sm flex flex-col gap-8 max-w-4xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-custom-border/50">
        <div>
          <h3 className="font-serif font-light text-3xl text-custom-dark-text leading-tight">
            Voice Profiles
          </h3>
          <p className="text-custom-soft-text text-sm mt-1 font-sans">
            Set personal voices for your reminders to match your real-life environment.
          </p>
        </div>
        <div className="bg-[#FAF2EE] text-[#C06B4A] border border-[#E9D5C8] px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto select-none">
          <span>🎙️</span> Personalized Audio Reminders Active
        </div>
      </div>

      {/* GRID FOR PROFILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {voiceProfiles.map((profile) => {
          const hasVoice = !!profile.audioBase64;
          return (
            <div 
              key={profile.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between min-h-[160px] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br ${
                hasVoice 
                  ? 'border-custom-sage/30 from-white to-custom-sage-light/5' 
                  : 'border-custom-border from-white to-custom-card-sec/10'
              }`}
            >
              {/* Card Header Info */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none select-none p-2 bg-custom-card-sec rounded-xl shadow-inner">
                    {profile.emoji}
                  </span>
                  <div>
                    <h4 className="font-serif font-medium text-lg text-custom-dark-text flex items-center gap-1.5">
                      {profile.name}
                      {profile.isDefault && (
                        <span className="text-[10px] bg-custom-card-sec text-custom-soft-text px-2 py-0.5 rounded-md font-sans uppercase font-bold tracking-wider">
                          Default
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-custom-soft-text">
                      {hasVoice ? '✅ Recorded & Active' : 'No custom recording'}
                    </p>
                  </div>
                </div>

                {/* Delete / Clear Buttons */}
                <div className="flex items-center gap-1">
                  {hasVoice && (
                    <button
                      onClick={(e) => deleteProfileVoice(profile.id, profile.name, e)}
                      className="p-1.5 text-custom-soft-text hover:text-custom-rust hover:bg-custom-rust-light/10 rounded-lg transition-colors cursor-pointer"
                      title="Clear custom recording"
                    >
                      <VolumeX size={14} />
                    </button>
                  )}
                  {!profile.isDefault && (
                    <button
                      onClick={(e) => handleDeleteCustomProfile(profile.id, profile.name, e)}
                      className="p-1.5 text-custom-soft-text hover:text-custom-rust hover:bg-custom-rust-light/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete profile"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-custom-border/30 flex items-center justify-between gap-3">
                {hasVoice ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const audio = new Audio(profile.audioBase64);
                        audio.play().catch(e => console.error(e));
                        showToast(`Playing recorded voice profile for "${profile.name}"`, 'success');
                      }}
                      className="bg-custom-sage-light/20 text-custom-sage hover:bg-custom-sage/10 p-2.5 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                      title="Play Voice Reminder Preview"
                    >
                      <Volume2 size={15} />
                    </button>
                    <span className="text-xs text-custom-mid-text font-medium">Preview saved audio</span>
                  </div>
                ) : (
                  <span className="text-xs text-custom-soft-text italic font-medium">Ready to record!</span>
                )}

                <button
                  onClick={() => setActiveRecordProfile(profile)}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    hasVoice
                      ? 'border border-custom-sage/40 text-custom-sage bg-white hover:bg-custom-sage/5'
                      : 'bg-[#C06B4A] hover:bg-[#A95939] text-white shadow-sm'
                  }`}
                >
                  {hasVoice ? '🎙️ Re-record Voice' : '🎙️ Record Voice'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD CUSTOM PROFILE INTERFACE */}
      {voiceProfiles.length < 5 ? (
        <div className="border-t border-custom-border/50 pt-6 flex flex-col items-center">
          {!isAddingCustom ? (
            <button
              onClick={() => setIsAddingCustom(true)}
              className="flex items-center gap-2 border border-dashed border-[#C06B4A]/55 text-[#C06B4A] hover:bg-[#FAF2EE]/50 px-6 py-3.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer"
            >
              <Plus size={16} /> Add Custom Profile
            </button>
          ) : (
            <form 
              onSubmit={handleAddCustomProfile}
              className="w-full bg-[#FAF9F7] border border-custom-border rounded-2xl p-6 flex flex-col gap-4 animate-scale-up"
            >
              <div className="flex justify-between items-center pb-2 border-b border-custom-border/50">
                <h4 className="font-serif text-lg italic text-[#C06B4A]">Create Custom Voice Profile</h4>
                <button 
                  type="button" 
                  onClick={() => setIsAddingCustom(false)}
                  className="text-custom-soft-text hover:text-custom-dark-text p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                {/* Name */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-custom-mid-text">Profile Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Grandma, Coach, Mentor..."
                    className="bg-white border border-custom-border rounded-xl px-4 py-2.5 text-sm outline-none text-custom-dark-text focus:border-[#C06B4A] transition-all"
                    maxLength={15}
                  />
                </div>

                {/* Emoji Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-custom-mid-text">Select Emoji</label>
                  <div className="relative">
                    <select
                      value={customEmoji}
                      onChange={(e) => setCustomEmoji(e.target.value)}
                      className="w-full bg-white border border-custom-border rounded-xl px-4 py-2.5 text-sm outline-none text-custom-dark-text focus:border-[#C06B4A] transition-all cursor-pointer appearance-none"
                    >
                      {emojiSuggestions.map((em) => (
                        <option key={em} value={em}>{em} Emoji</option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-sm select-none">
                      {customEmoji}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Suggestion buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-custom-soft-text">Suggested Emojis:</span>
                {emojiSuggestions.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setCustomEmoji(em)}
                    className={`p-1.5 text-lg rounded-lg border transition-all ${
                      customEmoji === em ? 'border-custom-rust bg-custom-rust-light/15 scale-110' : 'border-transparent bg-white hover:border-custom-border'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-custom-mid-text hover:bg-custom-card-sec transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-custom-sage hover:bg-custom-sage/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Create Profile
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <p className="text-xs text-center text-custom-soft-text italic">
          Max of 5 profiles reached. Delete a custom profile to create a new one.
        </p>
      )}

      {/* RECORDING MODAL */}
      {activeRecordProfile && (
        <div 
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-custom-sidebar/85 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in"
          onClick={() => {
            if (!isRecording) setActiveRecordProfile(null);
          }}
        >
          <div 
            className="bg-white rounded-[24px] border border-custom-border w-full max-w-lg p-6 sm:p-8 shadow-2xl relative flex flex-col gap-6 my-auto animate-scale-up max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            {!isRecording && (
              <button 
                onClick={() => setActiveRecordProfile(null)}
                className="absolute top-6 right-6 text-custom-soft-text hover:text-custom-dark-text bg-custom-card-sec hover:bg-custom-border p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            )}

            {/* Profile Info */}
            <div className="flex flex-col items-center text-center gap-1.5 pb-2 border-b border-custom-border/50">
              <span className="text-4xl p-3 bg-[#FAF2EE] rounded-2xl select-none shadow-sm">
                {activeRecordProfile.emoji}
              </span>
              <h3 className="font-serif text-2xl italic font-medium text-custom-rust mt-1">
                Record Voice for {activeRecordProfile.name}
              </h3>
              <p className="text-xs text-custom-soft-text uppercase font-bold tracking-widest font-sans">
                Setup Voice Reminder Profile
              </p>
            </div>

            {/* Prompt sentence box */}
            <div className="bg-[#FAF9F7] border border-custom-border/80 rounded-2xl p-5 text-center flex flex-col gap-2">
              <span className="text-[10px] font-bold text-custom-soft-text uppercase tracking-widest">READ THIS OUT LOUD:</span>
              <p className="font-serif text-lg leading-relaxed text-custom-dark-text italic font-light px-2">
                "Hey {activeRecordProfile.name}, just a reminder — don't forget to complete your pending task. You've got this!"
              </p>
            </div>

            {/* Recording Controls Area */}
            <div className="flex flex-col items-center gap-4 py-2">
              {isRecording ? (
                <div className="flex flex-col items-center gap-3">
                  {/* Pulsing button */}
                  <div className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-20 w-20 rounded-full bg-custom-rust/30 animate-ping" />
                    <button
                      onClick={stopRecording}
                      className="relative bg-custom-rust hover:bg-custom-rust/90 text-white rounded-full p-6 transition-all duration-300 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Volume2 size={32} className="animate-pulse" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-custom-rust animate-ping" />
                    <span className="text-sm font-bold text-custom-rust font-mono">
                      Recording: {formatTime(recordingSeconds)}
                    </span>
                  </div>

                  <button
                    onClick={stopRecording}
                    className="bg-custom-dark-text hover:bg-custom-dark-text/90 text-white px-5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all"
                  >
                    Stop Recording
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {audioPreview ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      {/* Playback preview controller */}
                      <div className="flex items-center gap-3 bg-custom-card-sec/70 border border-custom-border p-3.5 rounded-full px-6 w-full max-w-sm justify-between">
                        <button
                          onClick={togglePlayPreview}
                          className="bg-custom-sage hover:bg-custom-sage/90 text-white p-2.5 rounded-full transition-all cursor-pointer flex items-center justify-center"
                          title="Preview recorded voice"
                        >
                          {isPlayingPreview ? <VolumeX size={18} /> : <Play size={18} className="ml-0.5" />}
                        </button>
                        <span className="text-xs text-custom-mid-text font-bold uppercase tracking-wider">
                          {isPlayingPreview ? '▶️ Playing Preview...' : '🎙️ Audio Recorded'}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-custom-sage" />
                      </div>

                      {/* Options */}
                      <div className="flex items-center gap-3 w-full max-w-sm">
                        <button
                          onClick={startRecording}
                          className="flex-1 border border-custom-rust/40 hover:bg-custom-rust/5 text-custom-rust py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all text-center"
                        >
                          Re-record
                        </button>
                        <button
                          onClick={saveProfileVoice}
                          className="flex-1 bg-custom-sage hover:bg-custom-sage/95 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all text-center"
                        >
                          Save Profile
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <button
                        onClick={startRecording}
                        className="bg-[#C06B4A] hover:bg-[#A95939] text-white rounded-full p-6 transition-all duration-300 shadow-lg cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                      >
                        <Mic size={32} />
                      </button>
                      <p className="text-xs text-custom-soft-text font-medium">
                        Click the mic to start. Tap stop when finished.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

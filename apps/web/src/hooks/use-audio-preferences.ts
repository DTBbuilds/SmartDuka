import { useState, useEffect } from "react";

/**
 * Hook for managing audio preferences
 * Stores preferences in localStorage for persistence
 */
export function useAudioPreferences() {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("audioPreferences");
      if (saved) {
        const { isMuted: savedMuted, volume: savedVolume } = JSON.parse(saved);
        setIsMuted(savedMuted ?? false);
        setVolume(savedVolume ?? 0.5);
      }
    } catch (error) {
      console.error("Failed to load audio preferences:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save preferences to localStorage
  const updatePreferences = (muted?: boolean, vol?: number) => {
    const newMuted = muted !== undefined ? muted : isMuted;
    const newVolume = vol !== undefined ? Math.max(0, Math.min(1, vol)) : volume;

    setIsMuted(newMuted);
    setVolume(newVolume);

    try {
      localStorage.setItem(
        "audioPreferences",
        JSON.stringify({
          isMuted: newMuted,
          volume: newVolume,
        })
      );
    } catch (error) {
      console.error("Failed to save audio preferences:", error);
    }
  };

  // Get effective volume (0 if muted, otherwise user volume)
  const getEffectiveVolume = (): number => {
    return isMuted ? 0 : volume;
  };

  return {
    isMuted,
    volume,
    isLoaded,
    getEffectiveVolume,
    updatePreferences,
    toggleMute: () => updatePreferences(!isMuted),
    setVolume: (vol: number) => updatePreferences(undefined, vol),
  };
}

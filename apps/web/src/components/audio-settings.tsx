"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@smartduka/ui";
import { useAudioPreferences } from "@/hooks/use-audio-preferences";

/**
 * Audio Settings Component
 * Provides mute toggle and volume control
 */
export function AudioSettings() {
  const { isMuted, volume, isLoaded, toggleMute, setVolume } = useAudioPreferences();

  if (!isLoaded) {
    return null; // Don't render until preferences are loaded
  }

  return (
    <div className="flex items-center gap-2">
      {/* Mute/Unmute Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={toggleMute}
        title={isMuted ? "Unmute audio notifications" : "Mute audio notifications"}
        className="h-8 w-8 p-0"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      {/* Volume Slider */}
      <input
        type="range"
        min="0"
        max="100"
        step="10"
        value={isMuted ? 0 : volume * 100}
        onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
        className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
        disabled={isMuted}
      />

      {/* Volume Percentage */}
      <span className="text-xs text-muted-foreground w-8 text-right">
        {Math.round((isMuted ? 0 : volume) * 100)}%
      </span>
    </div>
  );
}

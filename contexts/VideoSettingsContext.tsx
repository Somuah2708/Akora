import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VideoSettingsContextType {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;
}

const VideoSettingsContext = createContext<VideoSettingsContextType | undefined>(undefined);

export function VideoSettingsProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(true); // Start muted by default (Instagram behavior)

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <VideoSettingsContext.Provider value={{ isMuted, setIsMuted, toggleMute }}>
      {children}
    </VideoSettingsContext.Provider>
  );
}

export function useVideoSettings() {
  const context = useContext(VideoSettingsContext);
  if (context === undefined) {
    throw new Error('useVideoSettings must be used within a VideoSettingsProvider');
  }
  return context;
}

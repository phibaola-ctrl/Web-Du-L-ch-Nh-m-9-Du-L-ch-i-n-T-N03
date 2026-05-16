import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { VideoSummary } from '../types';

interface VideoSummaryModalProps {
  summary: VideoSummary;
  onClose: () => void;
}

export default function VideoSummaryModal({ summary, onClose }: VideoSummaryModalProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sceneDuration = 5000; // 5 seconds per scene

  // Audio setup
  useEffect(() => {
    const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    if (isPlaying && !isMuted) {
      audio.play().catch(err => console.warn("Audio autoplay blocked:", err));
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Audio sync
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying && !isMuted) {
      audioRef.current.play().catch(err => console.warn("Audio play blocked:", err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isMuted]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + (100 / (sceneDuration / 100)); // Smooth progress
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentScene]);

  const handleNext = () => {
    if (currentScene < summary.scenes.length - 1) {
      setCurrentScene(currentScene + 1);
      setProgress(0);
    } else {
// Transition back to start or stop
      setIsPlaying(false);
      setProgress(100);
    }
  };

  const handlePrev = () => {
    if (currentScene > 0) {
      setCurrentScene(currentScene - 1);
      setProgress(0);
    }
  };

  const scene = summary.scenes[currentScene];
  // Using picsum with scene title seed for visual variety
  const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(scene.title)}/1280/720?blur=1`;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
      >
        {/* Background Image with Ken Burns effect */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img 
              src={imageUrl} 
              alt={scene.title}
              className="w-full h-full object-cover opacity-60"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
                  Scene {currentScene + 1}
                </span>
                <div className="h-px w-12 bg-indigo-500/50" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight uppercase">
                {scene.title}
              </h2>
              <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed">
                {scene.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
          <div className="flex gap-2 flex-grow max-w-md">
            {summary.scenes.map((_, idx) => (
              <div key={idx} className="h-1 flex-grow bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: idx < currentScene ? '100%' : idx === currentScene ? `${progress}%` : '0%' 
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            ))}
          </div>
          <button 
            onClick={onClose}
            className="ml-6 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side Nav */}
        <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-center">
          <button 
            onClick={handlePrev}
            disabled={currentScene === 0}
            className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-0 group"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center">
          <button 
            onClick={handleNext}
            disabled={currentScene === summary.scenes.length - 1}
            className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-0 group"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:text-indigo-400 transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="flex items-center gap-2 text-[10px] font-bold text-white/50 uppercase tracking-widest hover:text-white transition-colors"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Audio Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 animate-pulse text-indigo-400" />
                  <span className="text-white">Cinematic Audio Active</span>
                </>
              )}
            </button>
          </div>
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
            BLISSFUL JOURNEY AI Travel Experience
          </div>
        </div>
      </motion.div>
    </div>
  );
}

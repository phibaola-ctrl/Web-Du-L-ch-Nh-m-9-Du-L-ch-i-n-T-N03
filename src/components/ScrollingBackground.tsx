import React from 'react';
import { motion } from 'motion/react';

const ScrollingBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" id="scrolling-bg-container">
      <motion.div
        animate={{
          x: ['0%', '-30%', '0%'],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 w-[150%] h-full opacity-30"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)',
        }}
        id="scrolling-bg-image"
      />
      {/* Overlay gradient to ensure text readability */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-transparent to-slate-50" 
        id="scrolling-bg-overlay"
      />
    </div>
  );
};

export default ScrollingBackground;

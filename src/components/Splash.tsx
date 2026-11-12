import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tv, Sparkles, ChevronRight } from 'lucide-react';

interface SplashProps {
  onFinish: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onFinish }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 400);
    }, 2200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  const handleSkip = () => {
    setShow(false);
    setTimeout(onFinish, 200);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0b0b0f] p-8 text-center"
        >
          {/* Subtle gold grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#eab30815_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* Top Bar with Skip */}
          <div className="w-full flex justify-end relative z-10 pt-2">
            <button
              onClick={handleSkip}
              className="px-3 py-1 text-xs font-semibold text-slate-400 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 flex items-center gap-1 transition"
            >
              Skip <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Center Brand Identity */}
          <div className="relative z-10 flex flex-col items-center my-auto">
            {/* TV Antenna & Icon Frame */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative mb-6"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#1c1c28] via-[#12121a] to-[#242436] p-[2px] shadow-[0_0_50px_rgba(234,179,8,0.25)] border border-amber-500/30 flex items-center justify-center">
                <div className="w-full h-full rounded-[22px] bg-[#0e0e14] flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600 text-[9px] font-black tracking-widest text-white shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </div>
                  <Tv className="w-10 h-10 text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]" />
                  <span className="text-[10px] font-black tracking-wider text-amber-300 mt-1 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" /> M2A
                  </span>
                </div>
              </div>

              {/* Antenna accent glow */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-amber-400/80 rounded-full blur-[2px]" />
            </motion.div>

            {/* Glowing Brand Title */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-4xl font-black tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm"
            >
              M2A
            </motion.h1>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-xs font-semibold text-amber-400/90 tracking-widest uppercase mt-1.5"
            >
              Live TV · Multi Apps · Games
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-[11px] text-slate-400 mt-4 max-w-xs leading-relaxed"
            >
              AI Tools | Freelancing | Software | Hosting | Careers
            </motion.p>
          </div>

          {/* Bottom Loading Progress */}
          <div className="w-full max-w-xs flex flex-col items-center relative z-10 pb-4">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">
              Connecting to marketing2advertising.com...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

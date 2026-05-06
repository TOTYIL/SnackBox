import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Package } from "lucide-react";

export function SplashAnimation({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide the splash screen after the animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 4500); // Wait 4.5s total before unmounting

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999999] bg-[#050505] flex items-center justify-center overflow-hidden"
        >
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Content Container */}
            <motion.div
              className="flex flex-col items-center justify-center gap-6 z-10"
              initial={{ scale: 1 }}
              animate={{ scale: 1.1 }}
              transition={{ delay: 2.5, duration: 2, ease: "easeIn" }}
            >
              {/* The Package Logo */}
              <motion.div
                initial={{ scale: 5, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2,
                  duration: 1.2,
                  ease: [0.175, 0.885, 0.32, 1.1],
                }}
                className="text-pink-500 shadow-pink-500/50 drop-shadow-[0_0_30px_rgba(236,72,153,0.8)]"
              >
                <Package size={100} strokeWidth={1.5} />
              </motion.div>

              {/* The Text */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, height: 0 }}
                animate={{ scale: 1, opacity: 1, height: "auto" }}
                transition={{ delay: 1.0, duration: 1.5, ease: "easeOut" }}
                className="overflow-hidden pb-4"
              >
                <motion.h1
                  initial={{ letterSpacing: "0.5em", filter: "blur(10px)" }}
                  animate={{ letterSpacing: "0.05em", filter: "blur(0px)" }}
                  transition={{ delay: 1.2, duration: 1.5, ease: "backOut" }}
                  className="text-4xl md:text-6xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.4)] px-2"
                >
                  SnackBox
                </motion.h1>
              </motion.div>
            </motion.div>

            {/* Cinematic light sweep */}
            <motion.div
              initial={{ left: "-100%", opacity: 0 }}
              animate={{ left: "200%", opacity: 1 }}
              transition={{ delay: 1.8, duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 mix-blend-overlay pointer-events-none z-20"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

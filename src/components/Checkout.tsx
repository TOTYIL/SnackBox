import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle,
  ArrowRight,
  Banknote,
  Smartphone,
  Award,
  AlertCircle,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Order } from "../data";
import { supabase } from "../lib/supabase";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessClose?: () => void;
  total: number;
  cartTotalItems: number;
  upiId: string;
  cravePoints: number;
  orders?: Order[];
  onComplete: (data: {
    name: string;
    phone: string;
    room: string;
    id: string;
    paymentMethod?: "cod" | "prepaid";
    pointsUsed?: number;
    serviceCharge?: number;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccessClose,
  total,
  cartTotalItems,
  upiId,
  cravePoints,
  orders = [],
  onComplete,
}) => {
  const [step, setStep] = useState<
    | "details"
    | "payment_online_choice"
    | "payment_app"
    | "success"
  >("details");
  const [paymentCode, setPaymentCode] = useState("");
  const [lockedAmount, setLockedAmount] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [successHeading, setSuccessHeading] = useState("Order Placed!");
  const hasSubmittedRef = useRef(false);
  const verificationHandledRef = useRef(false);
  const leftAppRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState(() => localStorage.getItem("snackbox_name") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("snackbox_phone") || "");

  const serviceCharge = 0;

  const [usePoints, setUsePoints] = useState(false);
  const pointsToRedeem =
    usePoints && cravePoints > 0 ? cravePoints : 0;
  const finalTotal = Math.max(0, total - pointsToRedeem);
  const prepaidTotal = finalTotal;

  const cleanUpiId = upiId.trim();
  const formattedAmount = lockedAmount ?? prepaidTotal.toFixed(2);
  const upiParams = `pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent("SnackBox")}&tr=${encodeURIComponent(`SB${paymentCode}`)}&tn=${encodeURIComponent(`SnackBox Order ${paymentCode}`)}&am=${formattedAmount}&cu=INR`;
  const upiLink = `upi://pay?${upiParams}`;

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setStep("details");
      setUsePoints(false);
      setLockedAmount(null);
      setSecondsLeft(5);
      setCountdownStarted(false);
      setSuccessHeading("Order Placed!");
      hasSubmittedRef.current = false;
      verificationHandledRef.current = false;
      leftAppRef.current = false;

      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPaymentCode(code);
    } else if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleProceedToMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone) {
      localStorage.setItem("snackbox_name", name);
      localStorage.setItem("snackbox_phone", phone);

      if (finalTotal <= 0) {
        // Fully paid with points!
        handleFinish("prepaid");
      } else {
        setStep("payment_online_choice");
      }
    }
  };

  const playSuccessChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playNote = (freq: number, startTime: number, duration: number, vol = 0.5) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine"; // pure sine wave
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01); // sharp mallet-like attack
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // fast decay
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // F6, A6, C7 triad, rapid 32nd-note feel
      playNote(1396.91, now, 0.15, 0.4);         // F6
      playNote(1760.00, now + 0.1, 0.15, 0.4);  // A6
      playNote(2093.00, now + 0.2, 0.4, 0.4);   // C7 (slightly longer ring for completion)
    } catch (e) {
      console.error("Failed to play chime", e);
    }
  };

  const triggerCelebration = (heading: string) => {
    setSuccessHeading(heading);
    playSuccessChime();
    setStep("success");
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 270,
        spread: 90,
        origin: { x: Math.random(), y: -0.1 },
        startVelocity: 15,
        gravity: 0.4,
        scalar: 0.8,
        ticks: 300,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleFinish = (method: "cod" | "prepaid") => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setLockedAmount(prepaidTotal.toFixed(2));
    triggerCelebration("Order Placed!");

    onComplete({
      name,
      phone,
      room: "Pickup",
      id: paymentCode,
      paymentMethod: method,
      pointsUsed: pointsToRedeem,
      serviceCharge: 0,
    }); // Send DB request immediately so it processes in background

    setTimeout(() => {
      if (onSuccessClose) onSuccessClose();
      else onClose(); // Close modal after confetti completes
    }, 2500);
  };

  const handleStartUpiVerification = () => {
    setLockedAmount(prepaidTotal.toFixed(2));
    setSecondsLeft(5);
    setCountdownStarted(false);
    verificationHandledRef.current = false;
    leftAppRef.current = false;

    if (!hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      onComplete({
        name,
        phone,
        room: "Pickup",
        id: paymentCode,
        paymentMethod: "prepaid",
        pointsUsed: pointsToRedeem,
        serviceCharge: 0,
      });
    }

    setStep("payment_app");
  };

  // Detect real-time verification from parent orders prop
  useEffect(() => {
    if (!isOpen || step !== "payment_app" || !paymentCode) return;
    const matchedOrder = orders.find((o) => o.id === paymentCode);
    if (matchedOrder?.paymentVerified && !verificationHandledRef.current) {
      verificationHandledRef.current = true;
      triggerCelebration("Payment Verified!");
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        if (onSuccessClose) onSuccessClose();
        else onClose();
      }, 2500);
    }
  }, [isOpen, step, paymentCode, orders]);

  // Detect when user leaves to the UPI app and returns to the app before starting the 5s countdown
  useEffect(() => {
    if (!isOpen || step !== "payment_app" || countdownStarted) return;

    if (document.visibilityState === "hidden" || document.hidden) {
      leftAppRef.current = true;
    }

    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPendingTimers = () => {
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const beginCountdown = () => {
      if (verificationHandledRef.current) return;
      if (document.visibilityState === "visible" && !document.hidden) {
        clearPendingTimers();
        setSecondsLeft(5);
        setCountdownStarted(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" || document.hidden) {
        leftAppRef.current = true;
        clearPendingTimers();
      } else if (document.visibilityState === "visible") {
        if (leftAppRef.current) {
          clearPendingTimers();
          resumeTimer = setTimeout(beginCountdown, 150);
        }
      }
    };

    const handleBlur = () => {
      leftAppRef.current = true;
      clearPendingTimers();
    };

    const handleReturnFocus = () => {
      if (leftAppRef.current && document.visibilityState === "visible" && !document.hidden) {
        if (resumeTimer) clearTimeout(resumeTimer);
        // Short settle delay so an OS app-chooser closing into the UPI app doesn't false-trigger
        resumeTimer = setTimeout(() => {
          if (document.visibilityState === "visible" && !document.hidden) {
            beginCountdown();
          }
        }, 350);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleReturnFocus);
    window.addEventListener("pageshow", handleReturnFocus);

    // Fallback: if no external UPI app opened (e.g. desktop or unsupported browser),
    // start once we confirm user remained active on the app.
    fallbackTimer = setTimeout(() => {
      if (
        !leftAppRef.current &&
        document.visibilityState === "visible" &&
        !document.hidden &&
        document.hasFocus()
      ) {
        beginCountdown();
      }
    }, 2500);

    return () => {
      clearPendingTimers();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleReturnFocus);
      window.removeEventListener("pageshow", handleReturnFocus);
    };
  }, [isOpen, step, countdownStarted]);

  // Supabase verification poll (active while visible on payment_app, including right when returning)
  useEffect(() => {
    if (!isOpen || step !== "payment_app" || !paymentCode) return;

    const checkVerification = async () => {
      if (!supabase || verificationHandledRef.current) return;
      if (document.visibilityState === "hidden") return;
      const { data } = await supabase
        .from("orders")
        .select("room, payment_verified")
        .eq("id", paymentCode)
        .maybeSingle();
      const isVerified =
        data &&
        (data.payment_verified === true ||
          (typeof data.room === "string" && data.room.includes("||V:OK")));
      if (isVerified && !verificationHandledRef.current) {
        verificationHandledRef.current = true;
        triggerCelebration("Payment Verified!");
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          if (onSuccessClose) onSuccessClose();
          else onClose();
        }, 2500);
      }
    };

    checkVerification();
    const pollInterval = setInterval(checkVerification, 800);
    const onVisibleCheck = () => {
      if (document.visibilityState === "visible") {
        checkVerification();
      }
    };
    document.addEventListener("visibilitychange", onVisibleCheck);
    window.addEventListener("focus", onVisibleCheck);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", onVisibleCheck);
      window.removeEventListener("focus", onVisibleCheck);
    };
  }, [isOpen, step, paymentCode]);

  // 5-second verification countdown (runs only after countdownStarted is true)
  useEffect(() => {
    if (!isOpen || step !== "payment_app" || !paymentCode || !countdownStarted) return;

    const countdownInterval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    const timeoutTimer = setTimeout(() => {
      if (!verificationHandledRef.current) {
        verificationHandledRef.current = true;
        triggerCelebration("Order Placed!");
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          if (onSuccessClose) onSuccessClose();
          else onClose();
        }, 2500);
      }
    }, 5000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(timeoutTimer);
    };
  }, [isOpen, step, paymentCode, countdownStarted]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === "payment_app" || step === "success" ? undefined : onClose}
            className="absolute inset-0 bg-black/60 glass-backdrop-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-panel w-full max-w-md rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 relative z-10 shadow-2xl border border-white/20 max-h-[90dvh] flex flex-col overflow-y-auto"
          >
            {step !== "success" && step !== "payment_app" && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition z-20"
              >
                <X size={20} />
              </button>
            )}

            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-1.5 pr-8">Pickup Details</h2>
                <p className="text-white/60 mb-5 sm:mb-6 text-sm">
                  Enter your details for order pickup.
                </p>

                <form onSubmit={handleProceedToMethod} className="space-y-3.5 sm:space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1 ml-1">
                      Name
                    </label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      pattern="^[A-Za-z\s]{3,}$"
                      title="Name must be at least 3 alphabets long"
                      className="glass-input w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1 ml-1">
                      Phone Number
                    </label>
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      pattern="^[0-9]{10}$"
                      maxLength={10}
                      title="Phone number must be exactly 10 digits"
                      className="glass-input w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl"
                      placeholder="9876543210"
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10 mt-5 sm:mt-6 relative">
                    <label
                      className={`flex items-start gap-3 p-3.5 sm:p-4 mb-4 rounded-xl sm:rounded-2xl border transition-colors group ${cravePoints > 0 ? "bg-white/5 border-white/10 cursor-pointer hover:bg-white/10" : "bg-black/20 border-white/5 opacity-80 cursor-not-allowed"}`}
                    >
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={usePoints}
                          disabled={cravePoints <= 0}
                          onChange={(e) => setUsePoints(e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-black/50 text-pink-500 focus:ring-pink-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Award
                            size={18}
                            className={
                              cravePoints > 0
                                ? "text-yellow-400"
                                : "text-yellow-400/50"
                            }
                          />
                          <span
                            className={`font-bold transition-colors ${cravePoints > 0 ? "text-white group-hover:text-pink-300" : "text-white/60"}`}
                          >
                            Use Crave Candy
                          </span>
                        </div>
                        <p className="text-xs text-white/50">
                          Balance: ₹{cravePoints.toFixed(2)}
                          {cravePoints <= 0 ? (
                            <span className="block text-white/40 mt-1">
                              No points available
                            </span>
                          ) : (
                            usePoints && (
                              <span className="block text-pink-400 mt-1">
                                Deducting ₹{pointsToRedeem.toFixed(2)} from balance
                              </span>
                            )
                          )}
                        </p>
                      </div>
                    </label>

                    <div className="flex flex-col gap-2 mb-6">
                      <div className="flex justify-between items-center text-sm text-white/60">
                        <span>Cart Total</span>
                        <span>₹{total.toFixed(2)}</span>
                      </div>
                      {usePoints && pointsToRedeem > 0 && (
                        <div className="flex justify-between items-center text-sm text-pink-400">
                          <span>Crave Candy point discount</span>
                          <span>- ₹{pointsToRedeem.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-1 relative">
                        <span className="text-white/70">Total Amount</span>
                        <span className="text-2xl font-bold">
                          ₹{finalTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-2">
                    <button
                      type="submit"
                      className="w-full bg-white text-black font-semibold rounded-full p-4 flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                    >
                      {finalTotal <= 0 ? (
                        <>
                          Complete Order <CheckCircle size={18} />
                        </>
                      ) : (
                        <>
                          Proceed to Payment <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === "payment_online_choice" && (
              <motion.div
                key="payment_online_choice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button
                  onClick={() => setStep("details")}
                  className="text-white/50 text-sm hover:text-white mb-3 py-1 -ml-1 px-1 block"
                >
                  ← Back to Details
                </button>
                <h2 className="text-xl sm:text-2xl font-bold mb-1 pr-8">Online Payment</h2>
                <p className="text-white/60 mb-4 text-sm">
                  Choose how you want to pay.
                </p>

                {/* Total & Cost Breakdown */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 mb-4 sm:mb-5 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm text-white/60">
                    <span>Cart Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                  {usePoints && pointsToRedeem > 0 && (
                    <div className="flex justify-between items-center text-sm text-pink-400">
                      <span>Crave Candy point discount</span>
                      <span>- ₹{pointsToRedeem.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-1">
                    <span className="text-white/80 font-medium">Total Amount</span>
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      ₹{formattedAmount}
                    </span>
                  </div>
                </div>

                {!cleanUpiId && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 sm:p-4 mb-3 flex items-start gap-3 text-left">
                    <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-red-200">
                      UPI ID is not configured in Payment Config. Please set a UPI ID in the Dev Page or pay at pickup below.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 auto-rows-fr gap-3">
                  {cleanUpiId && (
                    <a
                      href={upiLink}
                      target="_top"
                      onClick={handleStartUpiVerification}
                      className="w-full h-full min-h-[88px] bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center justify-start gap-3 sm:gap-4 transition-colors group cursor-pointer"
                    >
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Smartphone size={22} className="sm:w-6 sm:h-6" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg mb-0.5">
                          Pay with UPI App
                        </h3>
                        <p className="text-xs sm:text-sm text-white/50">
                          Pay ₹{formattedAmount} via UPI app
                        </p>
                        <p className="text-[11px] sm:text-xs text-green-400 font-semibold mt-1 flex items-center gap-1">
                          <Award size={12} className="shrink-0" />
                          Earn Crave Candies
                        </p>
                      </div>
                    </a>
                  )}

                  <button
                    onClick={() => handleFinish("cod")}
                    className="w-full h-full min-h-[88px] bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center justify-start gap-3 sm:gap-4 transition-colors group"
                  >
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Banknote size={22} className="sm:w-6 sm:h-6" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg mb-0.5">
                        Pay at Pickup
                      </h3>
                      <p className="text-xs sm:text-sm text-white/50">
                        Pay when you pick up your order
                      </p>
                      <p className="text-[11px] sm:text-xs text-red-400 font-semibold mt-1">
                        No Crave Candies
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === "payment_app" && (
              <motion.div
                key="payment_app"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="text-center py-8 px-2 flex flex-col items-center justify-center"
              >
                {/* Cool multi-ring orbital loader */}
                <div className="relative w-32 h-32 mx-auto mb-7 flex items-center justify-center">
                  {/* Ambient radial aura */}
                  <motion.div
                    animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.85, 0.45] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500/40 via-purple-500/30 to-indigo-500/40 blur-2xl"
                  />

                  {/* Outer dual-arc spinning ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-pink-400 border-r-indigo-400 shadow-[0_0_24px_rgba(236,72,153,0.45)]"
                  />

                  {/* Middle counter-rotating dashed orbit */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-3 rounded-full border-2 border-dashed border-white/25"
                  />

                  {/* Inner glowing ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-6 rounded-full border-2 border-transparent border-b-cyan-400 border-l-purple-400"
                  />

                  {/* Center glass core */}
                  <motion.div
                    animate={{ scale: [0.95, 1.06, 0.95] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/25 to-indigo-500/25 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-inner"
                  >
                    <Smartphone size={26} className="text-pink-300" />
                  </motion.div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white via-pink-100 to-indigo-200 bg-clip-text text-transparent">
                  Verifying Payment
                </h2>
                <p className="text-white/60 text-sm mb-6 max-w-xs">
                  Checking confirmation for{" "}
                  <span className="text-white font-semibold">₹{formattedAmount}</span>{" "}
                  <span className="text-white/40 font-mono">(#{paymentCode})</span>
                </p>

                {/* Smooth 5-second progress bar (starts once user is back on the app) */}
                <div className="w-full max-w-xs bg-white/10 h-1.5 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: countdownStarted ? "100%" : "0%" }}
                    transition={
                      countdownStarted
                        ? { duration: 5, ease: "linear" }
                        : { duration: 0.2 }
                    }
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-400 to-indigo-400 shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                  />
                </div>
                <p className="text-xs text-white/40 font-medium tracking-wide">
                  {countdownStarted
                    ? `Redirecting to your orders in ${secondsLeft}s...`
                    : "Waiting for you to return from UPI app..."}
                </p>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle size={40} />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">{successHeading}</h2>
                <p className="text-white/70">
                  Your snacks are being prepared for pickup.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

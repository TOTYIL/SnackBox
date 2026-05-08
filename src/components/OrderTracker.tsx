import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  X,
  Clock,
  Loader,
  CheckCircle,
  XCircle,
  User,
  Award,
} from "lucide-react";
import { Order } from "../data";

interface OrderTrackerProps {
  orders: Order[];
  isOpen: boolean;
  onClose: () => void;
  onClearOrder: (id: string) => void;
  currentUser: { username: string } | null;
  cravePoints: number;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  orders,
  isOpen,
  onClose,
  onClearOrder,
  currentUser,
  cravePoints,
}) => {
  const [activeTab, setActiveTab] = useState<"tracker" | "profile">("tracker");
  const [clearingIds, setClearingIds] = useState<Record<string, boolean>>({});
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const handleDismissOrder = (id: string) => {
    setClearingIds((prev) => ({ ...prev, [id]: true }));
    timeoutRefs.current[id] = setTimeout(() => {
      onClearOrder(id);
      setClearingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete timeoutRefs.current[id];
    }, 5000);
  };

  const undoDismissOrder = (id: string) => {
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
    setClearingIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  useEffect(() => {
    return () => {
      // Clear all timers on unmount to prevent leaks and state updates
      Object.entries(timeoutRefs.current).forEach(([id, timer]) => {
        clearTimeout(timer);
      });
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 glass-backdrop-sm z-40"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-[90%] sm:w-[400px] glass-panel border-r border-white/10 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-4 sm:p-6 pb-0 flex flex-col gap-4">
              <div className="flex justify-between items-center bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                <button
                  onClick={() => setActiveTab("tracker")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeTab === "tracker" ? "bg-gradient-to-r from-pink-500 to-indigo-500 text-white shadow-lg" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                >
                  <Package
                    size={18}
                    className={activeTab === "tracker" ? "drop-shadow-md" : ""}
                  />
                  Orders
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeTab === "profile" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                >
                  <User
                    size={18}
                    className={activeTab === "profile" ? "drop-shadow-md" : ""}
                  />
                  Profile
                </button>
              </div>

              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-white/20 border border-white/10 rounded-full transition-all z-20 backdrop-blur-md"
              >
                <X size={18} className="text-white/80" />
              </button>
            </div>

            <div className="flex-1 relative w-full mt-4">
              <AnimatePresence mode="wait">
                {activeTab === "tracker" ? (
                  <motion.div
                    key="tracker"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 sm:px-6 pb-6 space-y-4 h-full absolute inset-0 overflow-y-auto"
                  >
                    {orders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-white/50 bg-black/20 rounded-3xl border border-white/5 p-8">
                        <Package
                          size={48}
                          className="mb-4 opacity-50 text-indigo-400"
                        />
                        <p className="font-medium">No active orders</p>
                        <p className="text-sm mt-2 opacity-50 text-center">
                          Your delicious snacks will appear here once you place
                          an order.
                        </p>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-black/40 backdrop-blur-md rounded-3xl p-5 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all duration-300"
                        >
                          {/* Top row of card */}
                          <div className="flex justify-between items-start mb-5 relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="bg-white/10 p-2 rounded-xl text-pink-400 border border-white/5">
                                <Package size={20} />
                              </div>
                              <div>
                                <h3 className="font-bold text-lg tracking-tight">
                                  Order #{order.id.slice(-4).toUpperCase()}
                                </h3>
                                <p className="text-xs text-white/50 font-medium">
                                  {new Date(order.date).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400 text-lg">
                                ₹{Math.max(0, order.total - (order.pointsUsed || 0) - (order.prepaidDiscount || 0)).toFixed(2)}
                              </span>
                              {order.pointsUsed || order.prepaidDiscount ? (
                                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  Discount Applied
                                </div>
                              ) : null}
                              {order.status === "completed" &&
                                (clearingIds[order.id] ? (
                                  <button
                                    onClick={() => undoDismissOrder(order.id)}
                                    className="text-xs font-bold text-white transition-colors bg-white/20 py-1 px-3 rounded-full flex items-center gap-1 relative overflow-hidden group/undo"
                                  >
                                    <span className="relative z-10">Undo Dismiss</span>
                                    <motion.div
                                      initial={{ width: "100%" }}
                                      animate={{ width: "0%" }}
                                      transition={{ duration: 5, ease: "linear" }}
                                      className="absolute bottom-0 left-0 h-full bg-pink-500/30"
                                    />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDismissOrder(order.id)}
                                    className="text-xs font-bold text-white/40 hover:text-white transition-colors bg-white/5 py-1 px-3 rounded-full flex items-center gap-1"
                                  >
                                    <X size={12} /> Dismiss
                                  </button>
                                ))}
                            </div>
                          </div>

                          {/* Progress Section */}
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="space-y-5 relative">
                              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />

                              <div className="flex items-center gap-4 relative">
                                <div className="bg-gradient-to-br from-pink-500 to-indigo-500 w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(236,72,153,0.5)] z-10 ring-4 ring-black/50">
                                  <CheckCircle
                                    size={12}
                                    className="text-white"
                                  />
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                  <div className="font-semibold text-sm">
                                    Placed
                                  </div>
                                  <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                                    Done
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`flex items-center gap-4 relative transition-all duration-500 ${order.status !== "pending" ? "opacity-100" : "opacity-30"}`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-black/50 ${order.status !== "pending" ? "bg-gradient-to-br from-indigo-400 to-purple-500 shadow-[0_0_10px_rgba(129,140,248,0.5)]" : "bg-white/10 border border-white/20"}`}
                                >
                                  {order.status !== "pending" ? (
                                    <CheckCircle
                                      size={12}
                                      className="text-white"
                                    />
                                  ) : (
                                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                                  )}
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                  <div className="font-semibold text-sm">
                                    Preparing
                                  </div>
                                  {order.status === "pending" && (
                                    <Loader
                                      size={12}
                                      className="text-white/50 animate-spin"
                                    />
                                  )}
                                </div>
                              </div>

                              <div
                                className={`flex items-center gap-4 relative transition-all duration-500 ${order.status === "completed" ? "opacity-100" : "opacity-30"}`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-black/50 ${order.status === "completed" ? "bg-gradient-to-br from-emerald-400 to-green-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-white/10 border border-white/20"}`}
                                >
                                  {order.status === "completed" ? (
                                    <CheckCircle
                                      size={12}
                                      className="text-white outline-none"
                                    />
                                  ) : (
                                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                                  )}
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                  <div className="font-semibold text-sm">
                                    Delivered
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {(order.status === "rejected" ||
                            order.status === "rage_blocked") && (
                            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-20">
                              <div className="bg-red-500/20 p-3 rounded-full mb-3">
                                <XCircle className="text-red-400 w-8 h-8" />
                              </div>
                              <h3 className="font-black text-xl text-white mb-1">
                                Cancelled
                              </h3>
                              <p className="text-sm text-red-200/80 mb-6 font-medium">
                                This order was cancelled by the store.
                              </p>
                              {clearingIds[order.id] ? (
                                <button
                                  onClick={() => undoDismissOrder(order.id)}
                                  className="bg-white/20 hover:bg-white text-white hover:text-black w-full py-3 rounded-xl font-bold transition-all relative overflow-hidden group/undo"
                                >
                                  <span className="relative z-10">Undo Dismiss</span>
                                  <motion.div
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: 5, ease: "linear" }}
                                    className="absolute bottom-0 left-0 h-1 bg-pink-500/50"
                                  />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDismissOrder(order.id)}
                                  className="bg-white/10 hover:bg-white text-white hover:text-black w-full py-3 rounded-xl font-bold transition-all"
                                >
                                  Dismiss Order
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 sm:px-6 h-full absolute inset-0 overflow-y-auto"
                  >
                    {currentUser ? (
                      <div className="space-y-4 pb-6">
                        {/* Profile Identiy Tile */}
                        <div className="p-6 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 relative overflow-hidden group">
                          {/* Aesthetic blur effects */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
                          <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3 group-hover:rotate-6 transition-transform">
                              <span className="text-2xl font-black text-white uppercase drop-shadow-md">
                                {currentUser.username.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-white/40 text-xs font-bold tracking-wider uppercase mb-1">
                                Hello
                              </p>
                              <h3 className="text-2xl font-black text-white tracking-tight leading-none">
                                {currentUser.username}
                              </h3>
                            </div>
                          </div>
                        </div>

                        {/* Crave Candy Tile */}
                        <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-pink-500/10 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/20 blur-3xl rounded-full" />
                          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />

                          <div className="flex items-start justify-between relative z-10 mb-6">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Award className="text-yellow-400 w-5 h-5 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                                <h4 className="font-bold text-white/80 tracking-wide">
                                  Crave Candy
                                </h4>
                              </div>
                              <p className="text-xs font-medium text-white/50 max-w-[200px] leading-relaxed">
                                Earn 0.02 Crave Candies per ₹1 spent on
                                successful deliveries.
                              </p>
                            </div>
                            <div className="bg-yellow-400/10 text-yellow-400 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-yellow-400/20 backdrop-blur-md">
                              Rewards
                            </div>
                          </div>

                          <div className="relative z-10">
                            <div className="flex items-baseline gap-2">
                              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-500 drop-shadow-sm tracking-tighter">
                                {cravePoints.toFixed(2)}
                              </span>
                              <span className="text-white/40 font-bold uppercase tracking-widest text-sm">
                                Pts
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            localStorage.removeItem("app_user");
                            window.location.reload();
                          }}
                          className="w-full py-4 mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <User size={18} /> Switch Account
                        </button>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-white/50">
                        Please log in to view profile
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

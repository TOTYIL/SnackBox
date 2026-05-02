import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, X, Clock, Loader, CheckCircle } from 'lucide-react';
import { Order } from '../data';

interface OrderTrackerProps {
  order: Order | null;
  onClear: () => void;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ order, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!order) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="glass-panel border-white/20 p-5 rounded-3xl w-72 sm:w-80 shadow-2xl mb-4 relative overflow-hidden"
          >
            <button 
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <Package size={18} className="text-pink-400" />
              Order Status
            </h3>
            <p className="text-sm text-white/60 mb-4 font-mono">#{order.id}</p>

            <div className="space-y-4 relative">
              <div className="absolute left-[11px] top-2 bottom-4 w-px bg-white/10" />
              
              <div className="flex items-start gap-4 relative">
                <div className="bg-gradient-to-br from-pink-500 to-indigo-500 w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(236,72,153,0.5)] z-10">
                  <CheckCircle size={12} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Order Placed</div>
                  <div className="text-xs text-white/50">Waiting for confirmation</div>
                </div>
              </div>

              <div className={`flex items-start gap-4 relative transition-colors ${order.status !== 'pending' ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${order.status !== 'pending' ? 'bg-gradient-to-br from-indigo-400 to-purple-500 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'bg-white/10'}`}>
                  {order.status !== 'pending' ? <CheckCircle size={12} className="text-white" /> : <Loader size={12} className="text-white animate-spin" />}
                </div>
                <div>
                  <div className="font-semibold text-sm">Preparing</div>
                  <div className="text-xs text-white/50">We're getting your snacks ready</div>
                </div>
              </div>

              <div className={`flex items-start gap-4 relative transition-colors ${order.status === 'completed' ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${order.status === 'completed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`}>
                  {order.status === 'completed' ? <CheckCircle size={12} className="text-white" /> : <Clock size={12} className="text-white" />}
                </div>
                <div>
                  <div className="font-semibold text-sm">Delivered</div>
                  <div className="text-xs text-white/50">Enjoy your snacks!</div>
                </div>
              </div>
            </div>

            {order.status === 'completed' && (
              <button 
                onClick={onClear}
                className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-xl transition"
              >
                Dismiss
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsExpanded(true)}
            className="bg-gradient-to-r from-pink-500 to-indigo-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:scale-105 transition flex items-center gap-2"
          >
            <Package size={20} />
            <span className="font-semibold pr-2">Track Order</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

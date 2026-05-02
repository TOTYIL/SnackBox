import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, X, Clock, Loader, CheckCircle, ChevronRight, XCircle } from 'lucide-react';
import { Order } from '../data';

interface OrderTrackerProps {
  orders: Order[];
  isOpen: boolean;
  onClose: () => void;
  onClearOrder: (id: string) => void;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ orders, isOpen, onClose, onClearOrder }) => {
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
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package className="text-pink-400" />
                Track Orders
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {orders.length === 0 ? (
                <div className="text-center text-white/50 py-12">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No active orders</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white/5 rounded-3xl p-5 border border-white/10 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg leading-none mb-1">#{order.id.slice(-6)}</h3>
                        <p className="text-xs text-white/50">{new Date(order.date).toLocaleTimeString()}</p>
                      </div>
                      <div className="flex gap-2">
                         <span className="font-bold text-indigo-300">₹{order.total}</span>
                         {order.status === 'completed' && (
                           <button 
                             onClick={() => onClearOrder(order.id)}
                             className="text-white/50 hover:text-white transition bg-white/5 p-1 rounded-full"
                             title="Dismiss"
                           >
                             <X size={16} />
                           </button>
                         )}
                      </div>
                    </div>

                    <div className="space-y-4 relative mt-2">
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
                    
                    {order.status === 'rejected' && (
                        <div className="absolute inset-0 bg-red-950/80 glass-backdrop-sm flex flex-col items-center justify-center text-center p-4 z-20">
                            <XCircle className="text-red-400 w-12 h-12 mb-2" />
                            <h3 className="font-bold text-white mb-1">Order Cancelled</h3>
                            <p className="text-sm text-white/70 mb-4">Your order was cancelled.</p>
                            <button onClick={() => onClearOrder(order.id)} className="bg-white text-black px-4 py-2 rounded-full font-semibold text-sm">Dismiss</button>
                        </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

import React from "react";
import { Product } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";

interface CartItem extends Product {
  quantity: number;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  onCheckout: () => void;
}

export const Cart: React.FC<CartProps> = ({ isOpen, onClose, items, updateQuantity, onCheckout }) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-full md:w-96 h-full glass-panel border-r-0 z-50 flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-2xl font-medium flex items-center gap-2">
                <ShoppingBag /> Your Box
              </h2>
              <button onClick={onClose} className="p-2 rounded-full glass-button hover:bg-white/20">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {items.length === 0 ? (
                <div className="text-center text-white/50 mt-10">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Your snack box is empty.</p>
                </div>
              ) : (
                items.map(item => (
                  <motion.div 
                    layout
                    key={item.id} 
                    className="flex gap-4 items-center bg-white/5 p-3 rounded-2xl border border-white/10"
                  >
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-1">{item.name}</h4>
                      <div className="text-sm text-white/60">₹{item.price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-3 glass-pill px-2 py-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-pink-400 transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="w-4 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-green-400 transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-black/20">
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg text-white/70">Total</span>
                <span className="text-3xl font-semibold">₹{total.toFixed(2)}</span>
              </div>
              <button 
                onClick={onCheckout}
                disabled={items.length === 0}
                className="w-full py-4 rounded-full bg-white text-black font-semibold text-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Checkout Now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

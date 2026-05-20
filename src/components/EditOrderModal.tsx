import React, { useState } from "react";
import { X, Search, Plus, Minus } from "lucide-react";
import { motion } from "motion/react";
import { Order } from "../data";

interface EditOrderModalProps {
  order: Order;
  products: any[];
  onClose: () => void;
  onSave: (orderId: string, newItems: any[], newTotal: number) => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, products, onClose, onSave }) => {
  const [items, setItems] = useState<any[]>([...order.items]);
  const [isSaving, setIsSaving] = useState(false);

  // Derive products list to add
  const availableProducts = products.filter(p => !items.find(i => i.id === p.id) && p.stock > 0);

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const prod = products.find(p => p.id === id);
      const limit = prod ? prod.stock : 999;
      const nextQ = Math.max(0, Math.min(limit, next[idx].quantity + delta));
      if (nextQ === 0) {
        next.splice(idx, 1);
        return next;
      }
      next[idx] = { ...next[idx], quantity: nextQ };
      return next;
    });
  };

  const addItem = (prod: any) => {
    setItems(prev => [...prev, { id: prod.id, name: prod.name, price: prod.price, quantity: 1 }]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    let subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const newTotal = Math.max(0, subtotal - (order.pointsUsed || 0) - (order.prepaidDiscount || 0));
    await onSave(order.id, items, newTotal);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
          <X size={18} />
        </button>
        <h2 className="text-xl font-bold mb-4">Edit Order #{order.id.slice(-4).toUpperCase()}</h2>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Current Items</h3>
            {items.length === 0 ? (
               <div className="text-center text-white/40 py-4">No items left</div>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    <div className="text-xs text-white/50">₹{Number(item.price).toFixed(2)} / ea</div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 shrink-0 border border-white/5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1 hover:bg-white/10 rounded-md transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1 hover:bg-white/10 rounded-md transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="space-y-2 pt-4 border-t border-white/10">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Add Products</h3>
            <div className="grid grid-cols-1 gap-2">
              {availableProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:border-indigo-400/50 transition-colors" onClick={() => addItem(p)}>
                  <div className="min-w-0 pr-3">
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="text-xs text-white/50 flex gap-2">
                       <span>₹{Number(p.price).toFixed(2)}</span>
                       {p.stock < 10 && <span className="text-amber-400 shrink-0">({p.stock} left)</span>}
                    </div>
                  </div>
                  <Plus size={16} className="text-indigo-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between font-bold mb-4">
             <span>New Subtotal</span>
             <span>₹{items.reduce((acc, i) => acc + i.price * i.quantity, 0).toFixed(2)}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || items.length === 0}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

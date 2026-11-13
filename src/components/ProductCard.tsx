import React, { useRef } from "react";
import { Product } from "../data";
import { Plus, Minus } from "lucide-react";
import { motion } from "motion/react";

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  userId?: string;
  onAdd: (product: Product) => void;
  onUpdate: (id: string, delta: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, cartQuantity, onAdd, onUpdate }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const isNew = product.created_at ? (Date.now() - new Date(product.created_at).getTime() < 24 * 60 * 60 * 1000) : false;

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col group h-full transition-all relative overflow-hidden backdrop-blur-md shadow-xl
        ${product.stock === 0 ? 'grayscale opacity-60' : ''}
        ${isNew ? 'bg-amber-500/10 border border-amber-500/30 ring-1 ring-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'glass-panel'}
      `}
    >
      <div className="relative w-full h-32 sm:h-40 xl:h-48 rounded-xl sm:rounded-2xl overflow-hidden mb-2.5 sm:mb-4">
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
        <div 
          style={{ backgroundImage: `url(${product.image})` }}
          className="w-full h-full bg-cover bg-center transform group-hover:scale-110 transition-transform duration-700"
          title={product.name}
        />
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20">
          <span className={`glass-pill px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold glass-backdrop-md ${product.stock < 10 ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white'}`}>
            Stock: {product.stock}
          </span>
        </div>
        {isNew && (
           <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20">
              <span className="glass-pill px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[10px] font-bold bg-amber-500/80 text-white shadow-lg backdrop-blur-md border border-amber-300">
                NEW
              </span>
           </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col pt-1 sm:pt-2 relative z-20">
        <div className="flex justify-between items-start mb-1 gap-1.5">
          <h3 className={`text-sm sm:text-lg xl:text-xl font-semibold sm:font-medium line-clamp-1 flex-1 ${isNew ? 'text-amber-200' : ''}`} title={product.name}>{product.name}</h3>
        </div>
        <p className="text-white/50 text-[11px] xl:text-xs leading-snug sm:leading-tight mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3 min-h-[1.85rem] sm:min-h-[2.5rem] flex-1">{product.description}</p>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mt-auto">
          <div className="font-bold sm:font-semibold text-base sm:text-lg xl:text-xl leading-none">₹{Number(product.price).toFixed(2)}</div>
          
          <div className="w-full sm:flex-1 sm:max-w-[140px]">
            {cartQuantity === 0 ? (
              <button 
                onClick={() => onAdd(product)}
                disabled={product.stock === 0}
                className={`w-full min-h-[38px] py-2 xl:py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-medium text-sm xl:text-base disabled:opacity-50 disabled:cursor-not-allowed ${isNew ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/30' : 'glass-button'}`}
              >
                <Plus size={16} />
                {product.stock === 0 ? 'Out' : 'Add'}
              </button>
            ) : (
              <div className="glass-panel bg-white/10 border-white/20 w-full min-h-[38px] rounded-xl flex items-center justify-between px-1.5 py-1">
                <button 
                  onClick={() => onUpdate(product.id, -1)} 
                  className="p-2 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors text-pink-300 hover:text-pink-200"
                >
                  <Minus size={14} />
                </button>
                <span className="font-semibold text-sm sm:text-base">{cartQuantity}</span>
                <button 
                  onClick={() => onUpdate(product.id, 1)} 
                  disabled={cartQuantity >= product.stock}
                  className="p-2 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors text-green-300 hover:text-green-200 disabled:opacity-50"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});


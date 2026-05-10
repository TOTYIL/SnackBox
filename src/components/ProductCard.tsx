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
      className={`rounded-3xl p-4 flex flex-col group h-full transition-all relative overflow-hidden backdrop-blur-md shadow-xl
        ${product.stock === 0 ? 'grayscale opacity-60' : ''}
        ${isNew ? 'bg-amber-500/10 border border-amber-500/30 ring-1 ring-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'glass-panel'}
      `}
    >
      <div className="relative w-full h-40 xl:h-48 rounded-2xl overflow-hidden mb-4">
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
        <div 
          style={{ backgroundImage: `url(${product.image})` }}
          className="w-full h-full bg-cover bg-center transform group-hover:scale-110 transition-transform duration-700"
          title={product.name}
        />
        <div className="absolute top-2 left-2 z-20">
          <span className={`glass-pill px-3 py-1 text-xs font-semibold glass-backdrop-md ${product.stock < 10 ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white'}`}>
            Stock: {product.stock}
          </span>
        </div>
        {isNew && (
           <div className="absolute top-2 right-2 z-20">
              <span className="glass-pill px-2 py-1 text-[10px] font-bold bg-amber-500/80 text-white shadow-lg backdrop-blur-md border border-amber-300">
                NEW
              </span>
           </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col pt-2 relative z-20">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className={`text-lg xl:text-xl font-medium line-clamp-1 flex-1 ${isNew ? 'text-amber-200' : ''}`} title={product.name}>{product.name}</h3>
        </div>
        <p className="text-white/50 text-[10.5px] xl:text-xs leading-tight mb-4 line-clamp-3 min-h-[2.5rem] flex-1">{product.description}</p>
        
        <div className="flex items-center justify-between gap-3 mt-auto">
          <div className="font-semibold text-lg xl:text-xl">₹{Number(product.price).toFixed(2)}</div>
          
          <div className="flex-1 max-w-[140px]">
            {cartQuantity === 0 ? (
              <button 
                onClick={() => onAdd(product)}
                disabled={product.stock === 0}
                className={`w-full py-2 xl:py-2.5 rounded-xl flex items-center justify-center gap-1 font-medium text-sm xl:text-base disabled:opacity-50 disabled:cursor-not-allowed ${isNew ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/30' : 'glass-button'}`}
              >
                <Plus size={16} />
                {product.stock === 0 ? 'Out' : 'Add'}
              </button>
            ) : (
              <div className="glass-panel bg-white/10 border-white/20 w-full rounded-xl flex items-center justify-between p-1">
                <button 
                  onClick={() => onUpdate(product.id, -1)} 
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-pink-300 hover:text-pink-200"
                >
                  <Minus size={14} />
                </button>
                <span className="font-semibold">{cartQuantity}</span>
                <button 
                  onClick={() => onUpdate(product.id, 1)} 
                  disabled={cartQuantity >= product.stock}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-green-300 hover:text-green-200 disabled:opacity-50"
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


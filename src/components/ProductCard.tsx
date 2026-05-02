import React from "react";
import { Product } from "../data";
import { Plus, Minus } from "lucide-react";
import { motion } from "motion/react";

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  onAdd: (product: Product) => void;
  onUpdate: (id: string, delta: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, cartQuantity, onAdd, onUpdate }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-3xl p-4 flex flex-col group h-full transition-all ${product.stock === 0 ? 'grayscale opacity-60' : ''}`}
    >
      <div className="relative w-full h-40 xl:h-48 rounded-2xl overflow-hidden mb-4">
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
        <img 
          src={product.image} 
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 z-20">
          <span className={`glass-pill px-3 py-1 text-xs font-semibold glass-backdrop-md ${product.stock < 10 ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white'}`}>
            Stock: {product.stock}
          </span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col pt-2">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className="text-lg xl:text-xl font-medium line-clamp-1 flex-1" title={product.name}>{product.name}</h3>
        </div>
        <p className="text-white/50 text-[10.5px] xl:text-xs leading-tight mb-4 line-clamp-3 min-h-[2.5rem] flex-1">{product.description}</p>
        
        <div className="flex items-center justify-between gap-3 mt-auto">
          <div className="font-semibold text-lg xl:text-xl">₹{Number(product.price).toFixed(2)}</div>
          
          <div className="flex-1 max-w-[140px]">
            {cartQuantity === 0 ? (
              <button 
                onClick={() => onAdd(product)}
                disabled={product.stock === 0}
                className="glass-button w-full py-2 xl:py-2.5 rounded-xl flex items-center justify-center gap-1 font-medium text-sm xl:text-base disabled:opacity-50 disabled:cursor-not-allowed"
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


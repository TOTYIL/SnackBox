import React, { useState, useEffect, useRef } from "react";
import { Product } from "../data";
import { Plus, Minus, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  userId?: string;
  onAdd: (product: Product) => void;
  onUpdate: (id: string, delta: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, cartQuantity, userId, onAdd, onUpdate }) => {
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [isScratched, setIsScratched] = useState(true);
  const [isGolden, setIsGolden] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product.created_at || !userId) {
      setIsScratched(true);
      return;
    }

    const createdTime = new Date(product.created_at).getTime();
    const isNew = Date.now() - createdTime < 24 * 60 * 60 * 1000;

    if (isNew) {
      const storageKey = `scratched_${userId}_${product.id}`;
      const scratchedAt = localStorage.getItem(storageKey);

      if (!scratchedAt) {
        setIsScratched(false);
        setIsGolden(true);
      } else {
        setIsScratched(true);
        const scratchedTime = parseInt(scratchedAt, 10);
        if (Date.now() - scratchedTime < 60 * 60 * 1000) {
          setIsGolden(true);
        }
      }
    }
  }, [product.created_at, product.id, userId]);

  const handleScratch = () => {
    if (!userId) return;
    setIsScratched(true);
    setIsGolden(true);
    localStorage.setItem(`scratched_${userId}_${product.id}`, Date.now().toString());

    if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { x, y },
            colors: ['#fbcfe8', '#c084fc', '#818cf8', '#fbbf24', '#f59e0b'],
            zIndex: 100
        });
    }
  };

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-4 flex flex-col group h-full transition-all relative overflow-hidden backdrop-blur-md shadow-xl
        ${product.stock === 0 ? 'grayscale opacity-60' : ''}
        ${isGolden ? 'bg-amber-500/20 border-2 border-amber-500/40 ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.15)]' : 'glass-panel'}
      `}
    >
      <AnimatePresence>
        {!isScratched && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 cursor-pointer overflow-hidden rounded-3xl"
            onClick={handleScratch}
          >
            {/* Metallic scratch overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 flex items-center justify-center">
               <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0ibTAsMGw4LDhtOCwtOGwtOCw4IiBzdHJva2U9IiMwMDAiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] mix-blend-overlay"></div>
               <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
               <div className="text-center p-4 relative z-10">
                   <Sparkles className="w-12 h-12 text-white/70 mx-auto mb-2 animate-pulse" />
                   <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 shadow-xl">
                     <p className="font-black text-gray-800 text-lg uppercase tracking-widest drop-shadow-sm">Scratch!</p>
                     <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">New Snack</p>
                   </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full h-40 xl:h-48 rounded-2xl overflow-hidden mb-4 bg-white/5">
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
        <img 
          src={product.image} 
          alt={product.name}
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transform group-hover:scale-110 transition-all duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0 scale-95'}`}
        />
        <div className="absolute top-2 left-2 z-20">
          <span className={`glass-pill px-3 py-1 text-xs font-semibold glass-backdrop-md ${product.stock < 10 ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white'}`}>
            Stock: {product.stock}
          </span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col pt-2 relative z-20">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className={`text-lg xl:text-xl font-medium line-clamp-1 flex-1 ${isGolden ? 'text-amber-200' : ''}`} title={product.name}>{product.name}</h3>
        </div>
        <p className="text-white/50 text-[10.5px] xl:text-xs leading-tight mb-4 line-clamp-3 min-h-[2.5rem] flex-1">{product.description}</p>
        
        <div className="flex items-center justify-between gap-3 mt-auto">
          <div className="font-semibold text-lg xl:text-xl">₹{Number(product.price).toFixed(2)}</div>
          
          <div className="flex-1 max-w-[140px]">
            {cartQuantity === 0 ? (
              <button 
                onClick={() => onAdd(product)}
                disabled={product.stock === 0}
                className={`w-full py-2 xl:py-2.5 rounded-xl flex items-center justify-center gap-1 font-medium text-sm xl:text-base disabled:opacity-50 disabled:cursor-not-allowed ${isGolden ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/30' : 'glass-button'}`}
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


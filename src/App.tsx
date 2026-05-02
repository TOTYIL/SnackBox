import React, { useState, useMemo, useEffect } from 'react';
import { products as initialProducts, categories, Product, Order } from './data';
import { ProductCard } from './components/ProductCard';
import { Cart } from './components/Cart';
import { DevPage } from './components/DevPage';
import { CheckoutModal } from './components/Checkout';
import { CustomerCare, TermsOfService, PrivacyPolicy } from './components/InfoPages';
import { Search, ShoppingBag, Package } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface CartItem extends Product {
  quantity: number;
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // App Global State
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [qrCodeUrl, setQrCodeUrl] = useState('https://images.unsplash.com/photo-1614680376593-902f74a5cecb?auto=format&fit=crop&w=400&q=80'); // Dummy QR
  const [isDevMode, setIsDevMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // New States
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activePage, setActivePage] = useState<'home' | 'care' | 'terms' | 'privacy'>('home');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Intercept special search query
  useEffect(() => {
    if (searchQuery.toLowerCase().trim() === 'snackdev2403') {
      setSearchQuery('');
      setIsDevMode(true);
    }
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    return productsList.filter(p => {
      const matchesCat = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery, productsList]);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    // No longer opening cart automatically!
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const startCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const finishCheckout = (customerData: {name: string, phone: string, room: string, id: string}) => {
    const newOrder: Order = {
      id: customerData.id,
      customerName: customerData.name,
      phone: customerData.phone,
      room: customerData.room,
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total: cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
      date: new Date().toISOString(),
      status: 'pending'
    };
    
    setOrders(prev => [newOrder, ...prev]);
    
    // Deduct stock from productsList
    setProductsList(prevProducts => 
      prevProducts.map(p => {
        const cartItem = cartItems.find(item => item.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      })
    );

    setCartItems([]);
    setIsCheckoutOpen(false);
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <>
      <div className="mesh-bg" />
      
      <div className="min-h-screen flex flex-col pt-24 pb-12 px-4 sm:px-6 lg:px-12 w-full max-w-[1800px] mx-auto">
        {/* Navigation Ribbon - Stretched and info dense */}
        <nav className="fixed top-0 left-0 w-full z-40 px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="w-full max-w-[1800px] mx-auto glass-panel border border-white/20 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 relative">
            {/* Logo shifted left */}
            <div className="flex items-center gap-2 font-bold text-lg sm:text-2xl tracking-tight shrink-0">
              <Package className="text-pink-400 w-6 h-6 sm:w-8 sm:h-8" />
              <span className={`${isSearchExpanded ? 'hidden sm:block' : 'block'}`}>SnackBox</span>
            </div>
            
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Search within Navigation Ribbon */}
              <div className={`relative group transition-all duration-300 ease-in-out ${isSearchExpanded ? 'w-full max-w-2xl' : 'w-10 sm:w-12 mx-2'}`}>
                {isSearchExpanded ? (
                  <>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors z-10" size={18} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Search cravings..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }}
                      className="bg-black/30 border border-white/10 hover:border-white/20 focus:border-white/40 focus:bg-black/50 text-white w-full pl-11 pr-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base outline-none transition-all shadow-inner"
                    />
                  </>
                ) : (
                  <button 
                    onClick={() => setIsSearchExpanded(true)}
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition"
                  >
                    <Search size={20} className="text-white/70" />
                  </button>
                )}
              </div>
              
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative glass-button p-2.5 sm:p-3 rounded-full flex items-center justify-center shrink-0"
              >
                <ShoppingBag size={20} className="sm:w-6 sm:h-6" />
                {cartTotalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[10px] sm:text-xs w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold shadow-md transform scale-110">
                    {cartTotalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="mb-8 mt-6 sm:mt-12 text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            Fuel your <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">
              study sessions.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-md mx-auto md:mx-0">
            Midnight cravings? We deliver premium snacks right to your hostel room in minutes.
          </p>
        </header>

        {/* Categories */}
        <div className="flex overflow-x-auto pb-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 gap-3 no-scrollbar [&::-webkit-scrollbar]:hidden">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-5 sm:px-6 py-2 sm:py-2.5 rounded-full border transition-all duration-300 text-sm sm:text-base ${
                activeCategory === cat 
                  ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] font-medium' 
                  : 'glass-panel border-white/20 hover:bg-white/10 font-medium text-white/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid - Increased Density (4+ columns on larger screens) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 xl:gap-6">
          {filteredProducts.map(product => {
            const cartItem = cartItems.find(item => item.id === product.id);
            return (
              <ProductCard 
                key={product.id} 
                product={product} 
                cartQuantity={cartItem ? cartItem.quantity : 0}
                onAdd={addToCart} 
                onUpdate={updateQuantity}
              />
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm mt-8">
            <p className="text-xl text-white/60">No snacks found matching your craving.</p>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="w-full mt-auto">
        <div className="glass-panel border-x-0 border-b-0 border-t border-white/10 py-1.5 px-2">
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-white/50">
            <div className="flex items-center gap-1 font-bold text-white/80 tracking-tight">
              <Package className="text-pink-400" size={12} />
              <span className="hidden sm:inline">SnackBox</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex justify-center gap-2 sm:gap-4">
              <button onClick={() => setActivePage('care')} className="hover:text-white transition">Customer Care</button>
              <button onClick={() => setActivePage('terms')} className="hover:text-white transition">Terms of Service</button>
              <button onClick={() => setActivePage('privacy')} className="hover:text-white transition">Privacy Policy</button>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="hidden sm:block">
              &copy; {new Date().getFullYear()} SnackBox Inc.
            </div>
          </div>
        </div>
      </footer>

      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        updateQuantity={updateQuantity}
        onCheckout={startCheckout}
      />

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={cartTotalPrice}
        qrCodeUrl={qrCodeUrl}
        onComplete={finishCheckout}
      />

      {/* Pages Overlay */}
      <AnimatePresence>
        {activePage === 'care' && <CustomerCare onClose={() => setActivePage('home')} />}
        {activePage === 'terms' && <TermsOfService onClose={() => setActivePage('home')} />}
        {activePage === 'privacy' && <PrivacyPolicy onClose={() => setActivePage('home')} />}
      </AnimatePresence>

      {/* Secret Dev Page */}
      <AnimatePresence>
        {isDevMode && (
          <DevPage 
            products={productsList}
            setProducts={setProductsList}
            qrCodeUrl={qrCodeUrl}
            setQrCodeUrl={setQrCodeUrl}
            orders={orders}
            updateOrderStatus={updateOrderStatus}
            onClose={() => setIsDevMode(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

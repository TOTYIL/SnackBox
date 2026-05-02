import React, { useState, useMemo, useEffect } from 'react';
import { products as initialProducts, categories, Product, Order } from './data';
import { ProductCard } from './components/ProductCard';
import { Cart } from './components/Cart';
import { DevPage } from './components/DevPage';
import { CheckoutModal } from './components/Checkout';
import { CustomerCare, TermsOfService, PrivacyPolicy } from './components/InfoPages';
import { OrderTracker } from './components/OrderTracker';
import { Search, ShoppingBag, Package, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from './lib/supabase';

interface CartItem extends Product {
  quantity: number;
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // App Global State
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('https://images.unsplash.com/photo-1614680376593-902f74a5cecb?auto=format&fit=crop&w=400&q=80');
  const [isDevMode, setIsDevMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // New States
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activePage, setActivePage] = useState<'home' | 'care' | 'terms' | 'privacy'>('home');
  const [sessionOrderIds, setSessionOrderIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('snackbox_orders');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    const old = sessionStorage.getItem('snackbox_order_id');
    if (old) return [old];
    return [];
  });
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [siteStatus, setSiteStatus] = useState<'live'|'offline'>('live');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Fetch Data on mount
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client not found. Falling back to local data.');
      setProductsList(initialProducts);
      return;
    }

    const loadData = async () => {
      // Products
      const { data: dbProducts, error: pErr } = await supabase.from('products').select('*').order('created_at', { ascending: true });
      if (dbProducts && dbProducts.length > 0) {
        setProductsList(dbProducts.filter(d => Number(d.stock) >= 0).map(d => ({
          id: d.id, name: d.name, description: d.description, price: Number(d.price), 
          category: d.category, image: d.image, inStock: d.in_stock, stock: Number(d.stock)
        })));
      } else {
        // Init data
        setProductsList(initialProducts);
        const { error: insertErr } = await supabase.from('products').insert(initialProducts.map(p => ({
          id: p.id, name: p.name, description: p.description, price: p.price, 
          category: p.category, image: p.image, in_stock: p.inStock, stock: p.stock
        })));
        if(insertErr) console.error('Error inserting initial products', insertErr);
      }

      // Payments Config
      const { data: qData } = await supabase.from('payment_config').select('qr_code_url').eq('id', 'config').single();
      if (qData) {
        setQrCodeUrl(qData.qr_code_url);
      } else {
        await supabase.from('payment_config').insert({ id: 'config', qr_code_url: qrCodeUrl });
      }

      // Site Status Config
      const { data: statusData } = await supabase.from('payment_config').select('qr_code_url').eq('id', 'site_status').single();
      if (statusData) {
        setSiteStatus(statusData.qr_code_url === 'offline' ? 'offline' : 'live');
      } else {
        await supabase.from('payment_config').insert({ id: 'site_status', qr_code_url: 'live' });
      }

      // Orders
      fetchOrders();
    };

    loadData();

    // Fallback polling for robust updates
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    // Listen to real-time changes
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
          fetchOrders();
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    if (!supabase) return;
    const { data: dbOrders } = await supabase.from('orders').select(`
      *,
      order_items (*)
    `).order('date', { ascending: false });
    
    if (dbOrders) {
      setOrders(dbOrders.map(o => ({
        id: o.id,
        customerName: o.customer_name,
        phone: o.phone,
        room: o.room,
        date: o.date,
        total: Number(o.total),
        status: o.status as Order['status'],
        items: o.order_items.map((oi: any) => ({
          id: oi.product_id,
          name: oi.name,
          price: Number(oi.price),
          quantity: oi.quantity
        }))
      })));
    }
  };

  // Intercept special search query
  useEffect(() => {
    if (searchQuery.toLowerCase().trim() === 'snackdev2403') {
      setSearchQuery('');
      setIsDevMode(true);
    }
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    const list = productsList.filter(p => {
      if (searchQuery.trim().length > 0) {
        return p.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return activeCategory === 'All' || p.category === activeCategory;
    });
    
    return list.sort((a, b) => {
      const aInStock = a.inStock && a.stock > 0;
      const bInStock = b.inStock && b.stock > 0;
      if (aInStock === bInStock) return 0;
      return aInStock ? -1 : 1;
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

  const finishCheckout = async (customerData: {name: string, phone: string, room: string, id: string}) => {
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
    
    // Update local state first to feel fast
    setOrders(prev => [newOrder, ...prev]);
    
    // Deduct stock from productsList local state
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
    
    // Set for session tracking
    const newSessionIds = [newOrder.id, ...sessionOrderIds.filter(id => id !== newOrder.id)];
    sessionStorage.setItem('snackbox_orders', JSON.stringify(newSessionIds));
    setSessionOrderIds(newSessionIds);
    setIsTrackerOpen(true);

    // Sync to Supabase
    if (supabase) {
      await supabase.from('orders').insert({
        id: newOrder.id,
        customer_name: newOrder.customerName,
        phone: newOrder.phone,
        room: newOrder.room,
        total: newOrder.total,
        status: newOrder.status,
        date: newOrder.date
      });

      await supabase.from('order_items').insert(newOrder.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })));

      // Deduct stock in DB
      for (const item of newOrder.items) {
        // Find current stock
        const p = productsList.find(pr => pr.id === item.id);
        if (p) {
          await supabase.from('products').update({ stock: Math.max(0, p.stock - item.quantity) }).eq('id', item.id);
        }
      }
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
    
    const oldStatus = orderToUpdate.status;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    
    // Sync to Supabase
    if (supabase) {
      await supabase.from('orders').update({ status }).eq('id', orderId);
    }

    // Handle stock changes
    const doUpdateStock = async (changes: {id: string, delta: number}[]) => {
      setProductsList(prev => prev.map(p => {
        const change = changes.find(c => c.id === p.id);
        if(change) return { ...p, stock: Math.max(0, p.stock + change.delta) };
        return p;
      }));
      if (supabase) {
        for(const change of changes) {
            const p = productsList.find(pr => pr.id === change.id);
            if (p) {
              await supabase.from('products').update({ stock: Math.max(0, p.stock + change.delta) }).eq('id', change.id);
            }
        }
      }
    };

    if (status === 'rejected' && oldStatus !== 'rejected') {
       doUpdateStock(orderToUpdate.items.map(item => ({ id: item.id, delta: item.quantity })));
    } else if (status !== 'rejected' && oldStatus === 'rejected') {
       doUpdateStock(orderToUpdate.items.map(item => ({ id: item.id, delta: -item.quantity })));
    }
  };

  const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const trackedOrders = useMemo(() => {
    return orders.filter(o => {
      if (!sessionOrderIds.includes(o.id)) return false;
      if (o.status === 'rejected') return false; 
      if (o.status === 'completed') {
          const orderTime = new Date(o.date).getTime();
          if (Date.now() - orderTime > 30 * 60 * 1000) return false;
      }
      return true;
    });
  }, [orders, sessionOrderIds]);

  return (
    <>
      <div className="mesh-bg" />
      
      <div className="min-h-screen flex flex-col pt-24 pb-12 px-4 sm:px-6 lg:px-12 w-full max-w-[1800px] mx-auto">
        {/* Navigation Ribbon - Stretched and info dense */}
        <nav className="fixed top-0 left-0 w-full z-40 px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="w-full max-w-[1800px] mx-auto glass-panel border border-white/20 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 relative">
            {/* Logo shifted left */}
            <button 
              onClick={() => setIsTrackerOpen(true)}
              className="flex items-center gap-2 font-bold text-lg sm:text-2xl tracking-tight shrink-0 hover:opacity-80 transition cursor-pointer"
            >
              <Package className="text-pink-400 w-6 h-6 sm:w-8 sm:h-8" />
              <span className={`${isSearchExpanded ? 'hidden sm:block' : 'block'}`}>SnackBox</span>
            </button>
            
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Search within Navigation Ribbon */}
              <div className={`relative group transition-all duration-300 ease-in-out ${isSearchExpanded ? 'w-full max-w-2xl' : 'w-10 sm:w-12 mx-2'}`}>
                {isSearchExpanded ? (
                  <>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 z-10" size={18} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Search cravings..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={(e) => { 
                        // Don't close if clicking the close button
                        if (e.relatedTarget?.id !== 'close-search') {
                          if(!searchQuery) setIsSearchExpanded(false); 
                        }
                      }}
                      className="bg-black/30 border border-white/10 hover:border-white/20 focus:border-white/40 focus:bg-black/50 text-white w-full px-11 py-2.5 sm:py-3 rounded-full text-sm sm:text-base outline-none transition-all shadow-inner"
                    />
                    <button 
                      id="close-search"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchExpanded(false);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-10 p-1"
                    >
                      <X size={16} />
                    </button>
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

        {siteStatus === 'offline' ? (
           <div className="flex-1 flex flex-col items-center justify-center text-center mt-20">
              <svg viewBox="0 0 100 100" className="w-48 h-48 mb-8 text-indigo-300 drop-shadow-[0_0_15px_rgba(165,180,252,0.3)]">
                 <path d="M50 85 C40 85 30 75 30 60 C30 45 40 30 50 20 C60 30 70 45 70 60 C70 75 60 85 50 85 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
                 <circle cx="42" cy="50" r="4" fill="currentColor"/>
                 <circle cx="58" cy="50" r="4" fill="currentColor"/>
                 <path d="M48 60 Q50 65 52 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                 <path d="M20 30 Q30 20 40 35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                 <path d="M80 30 Q70 20 60 35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                 <text x="70" y="30" fontSize="12" fill="currentColor" fontFamily="monospace" style={{animation: "float 3s infinite ease-in-out"}}>Z</text>
                 <text x="80" y="20" fontSize="16" fill="currentColor" fontFamily="monospace" style={{animation: "float 3s infinite ease-in-out 1s"}}>Z</text>
                 <text x="90" y="10" fontSize="20" fill="currentColor" fontFamily="monospace" style={{animation: "float 3s infinite ease-in-out 2s"}}>Z</text>
              </svg>
              <h2 className="text-3xl font-bold mb-4">Shh... The owl is sleeping</h2>
              <p className="text-white/60 text-lg">We are currently not accepting orders. Check back later!</p>
           </div>
        ) : (
          <>
            {/* Hero Section */}
            <header className="mb-8 mt-6 sm:mt-12 text-center md:text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
                Crave it. <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">
                  Click it. Crunch it.
                </span>
              </h1>
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
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 glass-backdrop-sm mt-8">
                <p className="text-xl text-white/60">No snacks found matching your craving.</p>
              </div>
            )}
          </>
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
            siteStatus={siteStatus}
            setSiteStatus={async (s) => {
              setSiteStatus(s);
              if (supabase) {
                await supabase.from('payment_config').update({ qr_code_url: s }).eq('id', 'site_status');
              }
            }}
            orders={orders}
            updateOrderStatus={updateOrderStatus}
            onClose={() => setIsDevMode(false)}
          />
        )}
      </AnimatePresence>

      <OrderTracker 
        orders={trackedOrders} 
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        onClearOrder={(id) => {
          const newIds = sessionOrderIds.filter(sid => sid !== id);
          sessionStorage.setItem('snackbox_orders', JSON.stringify(newIds));
          setSessionOrderIds(newIds);
        }} 
      />
    </>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { products as initialProducts, categories, Product, Order } from './data';
import { ProductCard } from './components/ProductCard';
import { Cart } from './components/Cart';
const DevPage = React.lazy(() => import('./components/DevPage').then(m => ({ default: m.DevPage })));
import { CheckoutModal } from './components/Checkout';
import { CustomerCare, TermsOfService, PrivacyPolicy } from './components/InfoPages';
import { OrderTracker } from './components/OrderTracker';
import { Search, ShoppingBag, Package, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from './lib/supabase';
import { AuthForm } from './components/AuthForm';
import { SplashAnimation } from './components/SplashAnimation';

interface CartItem extends Product {
  quantity: number;
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // App Global State
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [upiId, setUpiId] = useState('nhempire1717-3@oksbi');
  const [isDevMode, setIsDevMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // New States
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activePage, setActivePage] = useState<'home' | 'care' | 'terms' | 'privacy'>('home');
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splash_shown'));
  const [currentUser, setCurrentUser] = useState<{id: string, username: string} | null>(() => {
    try {
      const userStr = localStorage.getItem('app_user');
      if (userStr) return JSON.parse(userStr);
    } catch (e) {}
    return null;
  });
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissed_orders');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  useEffect(() => {
    if (!localStorage.getItem('restored_test_order_3')) {
      localStorage.removeItem('dismissed_orders');
      setDismissedOrderIds([]);
      localStorage.setItem('restored_test_order_3', 'true');
    }
  }, []);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [siteStatus, setSiteStatus] = useState<'live'|'offline'|'loading'>('loading');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchProducts = React.useCallback(async () => {
    if (!supabase) return;
    const { data: dbProducts, error: pErr } = await supabase.from('products').select('*').order('created_at', { ascending: true });
    if (dbProducts && dbProducts.length > 0) {
      const newProducts = dbProducts.filter(d => Number(d.stock) >= 0).map(d => ({
        id: d.id, name: d.name, description: d.description, price: Number(d.price), 
        category: d.category, image: d.image, inStock: d.in_stock, stock: Number(d.stock)
      }));
      setProductsList(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newProducts)) return prev;
        return newProducts;
      });
    } else {
      // Init data
      setProductsList(prev => {
        if (JSON.stringify(prev) === JSON.stringify(initialProducts)) return prev;
        return initialProducts;
      });
      const { error: insertErr } = await supabase.from('products').insert(initialProducts.map(p => ({
        id: p.id, name: p.name, description: p.description, price: p.price, 
        category: p.category, image: p.image, in_stock: p.inStock, stock: p.stock
      })));
      if(insertErr) console.error('Error inserting initial products', insertErr);
    }
  }, []);

  const fetchOrders = React.useCallback(async () => {
    if (!supabase || !currentUser) {
      setOrders([]);
      return;
    }

    const { data: dbOrders, error } = await supabase.from('orders').select(`
      *,
      order_items (*)
    `).eq('user_id', currentUser.id).order('date', { ascending: false });

    if (error) {
       console.error("DEBUG RLS: Error fetching your orders. Ensure RLS policies allow SELECTing orders by ID. Error:", error);
    }

    if (dbOrders) {
      const hidden = JSON.parse(localStorage.getItem('admin_hidden_orders') || '[]');
      const newOrders = dbOrders.filter(dbO => !hidden.includes(dbO.id)).map(o => {
        let actualRoom = o.room;
        let paymentMethod: 'cod' | 'prepaid' | undefined = undefined;
        // Try to read from payment_method column if it exists!
        if (o.payment_method) {
           paymentMethod = o.payment_method;
        } else if (typeof o.room === 'string' && o.room.includes('||')) {
          const parts = o.room.split('||');
          actualRoom = parts[0];
          paymentMethod = parts[1] as 'cod' | 'prepaid';
        }
        
        // Default to cod if missing
        if (!paymentMethod) {
          paymentMethod = 'cod';
        }

        const recent = recentlyUpdatedOrdersRef.current[o.id];
        let statusToUse = o.status as Order['status'];
        if (recent && (Date.now() - recent.timestamp < 10000)) {
           statusToUse = recent.status as Order['status'];
        }

        return {
          id: o.id,
          customerName: o.customer_name,
          phone: o.phone,
          room: actualRoom,
          paymentMethod,
          date: o.date,
          total: Number(o.total),
          status: statusToUse,
          items: o.order_items.map((oi: any) => ({
            id: oi.product_id,
            name: oi.name,
            price: Number(oi.price),
            quantity: oi.quantity
          }))
        };
      });
      setOrders(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newOrders)) return prev;
        return newOrders;
      });
    }
  }, [currentUser]);

  // Fetch Data on mount
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client not found. Falling back to local data.');
      setProductsList(initialProducts);
      setSiteStatus('live');
      return;
    }

    const loadData = async () => {
      await fetchProducts();

      // Payments Config
      const { data: qData } = await supabase.from('payment_config').select('qr_code_url').eq('id', 'config').single();
      if (qData) {
        setUpiId(qData.qr_code_url);
      } else {
        await supabase.from('payment_config').insert({ id: 'config', qr_code_url: upiId });
      }

      // Site Status Config
      const { data: statusData } = await supabase.from('payment_config').select('qr_code_url').eq('id', 'site_status').single();
      if (statusData) {
        setSiteStatus(statusData.qr_code_url === 'offline' ? 'offline' : 'live');
      } else {
        await supabase.from('payment_config').insert({ id: 'site_status', qr_code_url: 'live' });
        setSiteStatus('live');
      }

      // Orders
      fetchOrders();
    };

    loadData();

    // Fallback polling for robust updates
    const interval = setInterval(async () => {
      fetchOrders();
      fetchProducts();
      
      if (supabase) {
        // Poll Site Status and Config just in case real-time isn't enabled
        const { data: statusData } = await supabase.from('payment_config').select('qr_code_url').eq('id', 'site_status').single();
        if (statusData) setSiteStatus(statusData.qr_code_url === 'offline' ? 'offline' : 'live');
        
        const { data: qData } = await supabase.from('payment_config').select('qr_code_url').eq('id', 'config').single();
        if (qData) setUpiId(qData.qr_code_url);
      }
    }, 5000);

    // Listen to real-time changes
    let ordersChannel: any = null;
    let configChannel: any = null;
    let productsChannel: any = null;
    if (supabase) {
      if (currentUser) {
        const orderFilters: any = { event: '*', schema: 'public', table: 'orders' };
        orderFilters.filter = `user_id=eq.${currentUser.id}`;
        
        ordersChannel = supabase
          .channel('public:orders_user_' + currentUser.id)
          .on('postgres_changes', orderFilters, payload => {
            fetchOrders();
          })
          .subscribe();
      }

      configChannel = supabase
        .channel('public:payment_config')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_config' }, payload => {
          if (payload.new) {
             const newData = payload.new as any;
             if (newData.id === 'site_status') {
               setSiteStatus(newData.qr_code_url === 'offline' ? 'offline' : 'live');
             } else if (newData.id === 'config') {
               setUpiId(newData.qr_code_url);
             }
          }
        })
        .subscribe();
        
      productsChannel = supabase
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
          fetchProducts();
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (ordersChannel) supabase.removeChannel(ordersChannel);
      if (configChannel) supabase.removeChannel(configChannel);
      if (productsChannel) supabase.removeChannel(productsChannel);
    };
  }, [fetchOrders, fetchProducts, currentUser]);

  // Intercept special search query
  useEffect(() => {
    if (searchQuery.toLowerCase().trim() === 'snackdev2403') {
      setSearchQuery('');
      setIsDevMode(true);
    }
  }, [searchQuery]);

  const productCategories = useMemo(() => {
    return ['All', ...Array.from(new Set(productsList.map(p => {
      const c = (p.category || '').trim();
      return c ? c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() : '';
    })))].filter(Boolean);
  }, [productsList]);

  // Check rage mode via user orders
  const isRageBlocked = useMemo(() => {
    return orders.some(o => 
      o.status === 'rage_blocked' && 
      Date.now() - new Date(o.date).getTime() < 2 * 60 * 60 * 1000
    );
  }, [orders]);

  const filteredProducts = useMemo(() => {
    const list = productsList.filter(p => {
      if (searchQuery.trim().length > 0) {
        return p.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (activeCategory === 'All') return true;
      const prodCat = (p.category || '').trim().toLowerCase();
      const activeLower = activeCategory.trim().toLowerCase();
      return prodCat === activeLower;
    });
    
    return list.sort((a, b) => {
      const aInStock = a.inStock && a.stock > 0;
      const bInStock = b.inStock && b.stock > 0;
      if (aInStock === bInStock) return 0;
      return aInStock ? -1 : 1;
    });
  }, [activeCategory, searchQuery, productsList]);

  const addToCart = React.useCallback((product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const cravePoints = useMemo(() => {
    let earned = 0;
    let used = 0;
    orders.forEach(o => {
      // Points earned from completed orders
      if (o.status === 'completed') {
        earned += o.total * 0.02;
      }
      // Points used in any non-rejected order
      if (o.status !== 'rejected' && o.status !== 'rage_blocked') {
        const match = o.room.match(/\|\|P:([\d.]+)/);
        if (match) {
          used += parseFloat(match[1]);
        }
      }
    });
    return Math.max(0, earned - used);
  }, [orders]);

  const updateQuantity = React.useCallback((id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        let newQ = item.quantity + delta;
        if (newQ > item.stock) newQ = item.stock;
        return newQ > 0 ? { ...item, quantity: newQ } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  }, []);

  const startCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const finishCheckout = async (customerData: {name: string, phone: string, room: string, id: string, paymentMethod?: 'cod' | 'prepaid', pointsUsed?: number}) => {
    let orderTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    
    let actualPointsUsed = 0;
    if (customerData.pointsUsed && customerData.pointsUsed > 0 && cravePoints >= 1) {
      actualPointsUsed = Math.min(orderTotal, cravePoints, customerData.pointsUsed);
      orderTotal -= actualPointsUsed;
      orderTotal = Math.max(0, orderTotal);
    }

    if (customerData.paymentMethod === 'prepaid') {
      const discount = Math.min(0.5, cartTotalItems * 0.1);
      orderTotal -= discount;
      orderTotal = Math.max(0, orderTotal);
    }

    const newOrder: Order = {
      id: customerData.id,
      customerName: customerData.name,
      phone: customerData.phone,
      room: customerData.room,
      paymentMethod: customerData.paymentMethod,
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total: Number(orderTotal.toFixed(2)),
      date: new Date().toISOString(),
      status: 'pending'
    };
    
    // Update local state first to feel fast
    setOrders(prev => [newOrder, ...prev]);
    
    // Do NOT Deduct stock here. Wait until order is accepted.
    setProductsList(prevProducts => [...prevProducts]);
    
    setCartItems([]);
    setIsCheckoutOpen(false);
    
    // Set for session tracking
    setIsTrackerOpen(true);

    // Sync to Supabase
    if (supabase && currentUser) {
      const roomString = newOrder.room + 
                         (customerData.paymentMethod ? '||' + customerData.paymentMethod : '') + 
                         (actualPointsUsed > 0 ? '||P:' + actualPointsUsed.toFixed(2) : '');
                         
      await supabase.from('orders').insert({
        id: newOrder.id,
        customer_name: newOrder.customerName,
        phone: newOrder.phone,
        room: roomString,
        total: newOrder.total,
        status: newOrder.status,
        date: newOrder.date,
        user_id: currentUser.id
      });

      await supabase.from('order_items').insert(newOrder.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })));

      // Do NOT Deduct stock in DB yet. Wait until accept.
      // for (const item of newOrder.items) { ... }
    }
  };

  const deleteOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    
    try {
      const hidden = JSON.parse(localStorage.getItem('admin_hidden_orders') || '[]');
      if (!hidden.includes(orderId)) {
        hidden.push(orderId);
        localStorage.setItem('admin_hidden_orders', JSON.stringify(hidden));
      }
    } catch(e) {}
    
    if (supabase) {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
    }
  };

  const processingOrdersRef = React.useRef<Set<string>>(new Set());
  const recentlyUpdatedOrdersRef = React.useRef<Record<string, {status: string, timestamp: number}>>({});

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    if (processingOrdersRef.current.has(orderId)) return;
    
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
    
    // Check recent local override
    const recent = recentlyUpdatedOrdersRef.current[orderId];
    const actualOldStatus = recent && (Date.now() - recent.timestamp < 10000) ? recent.status : orderToUpdate.status;
    
    if (actualOldStatus === status) return;

    processingOrdersRef.current.add(orderId);
    
    try {
      recentlyUpdatedOrdersRef.current[orderId] = { status, timestamp: Date.now() };
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      
      // Sync to Supabase immediately
      if (supabase) {
        const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
        if (error) console.error("Error updating order status:", error);
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
              const { data, error } = await supabase.from('products').select('stock').eq('id', change.id).single();
              if (error) console.error("Error fetching product stock:", error);
              if (data && data.stock !== undefined) {
                await supabase.from('products').update({ stock: Math.max(0, data.stock + change.delta) }).eq('id', change.id);
              }
          }
        }
      };

      const stockIsDeducted = (s: Order['status']) => s === 'accepted' || s === 'completed';
      const oldDeducted = stockIsDeducted(actualOldStatus);
      const newDeducted = stockIsDeducted(status);

      if (!oldDeducted && newDeducted) {
        // Transitioned to Accepted/Completed: Deduct Stock
        await doUpdateStock(orderToUpdate.items.map(item => ({ id: item.id, delta: -item.quantity })));
      } else if (oldDeducted && !newDeducted) {
        // Transitioned to Pending/Rejected: Restore Stock
        await doUpdateStock(orderToUpdate.items.map(item => ({ id: item.id, delta: item.quantity })));
      }
    } finally {
      processingOrdersRef.current.delete(orderId);
    }
  };

  const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const trackedOrders = useMemo(() => {
    return orders.filter(o => {
      if (dismissedOrderIds.includes(o.id)) return false;
      if (o.status === 'completed' || o.status === 'rejected' || o.status === 'rage_blocked') {
          const orderTime = new Date(o.date).getTime();
          if (Date.now() - orderTime > 30 * 60 * 1000) return false;
      }
      return true;
    });
  }, [orders, dismissedOrderIds]);

  if (!currentUser) {
    return (
      <>
        <div className="mesh-bg" />
        <AuthForm onAuthComplete={(user) => {
          localStorage.setItem('app_user', JSON.stringify(user));
          setCurrentUser(user);
        }} />
      </>
    );
  }

  if (isRageBlocked) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full p-8 sm:p-16 bg-red-950/40 border-[4px] border-red-600 rounded-3xl text-center shadow-[0_0_100px_rgba(220,38,38,0.5)] relative">
          <h1 className="text-4xl sm:text-6xl font-black text-red-500 tracking-tighter uppercase leading-tight">
            YOUR ORDER WAS CANCELED BECAUSE YOU ARE A COCK SUCKER
          </h1>
          <p className="mt-8 text-red-400/80 font-bold tracking-widest text-sm uppercase">Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSplash && (
        <SplashAnimation
          onComplete={() => {
            sessionStorage.setItem('splash_shown', 'true');
            setShowSplash(false);
          }}
        />
      )}
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

        {siteStatus === 'loading' ? (
           <div className="flex-1 flex flex-col items-center justify-center text-center mt-20">
               <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-white/50 animate-pulse">Waking up the owl...</p>
           </div>
        ) : siteStatus === 'offline' ? (
           <div className="flex-1 flex flex-col items-center justify-center text-center mt-20">
              <svg viewBox="0 0 100 100" className="w-48 h-48 mb-8 text-indigo-300 drop-shadow-[0_0_15px_rgba(165,180,252,0.3)]">
                  <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      {/* Z Z */}
                      <g style={{ animation: 'floatZ 4s ease-in-out infinite' }} transformOrigin="72px 20px">
                         <path d="M 68 15 L 76 15 L 68 24 L 76 24" strokeWidth="3" />
                      </g>
                      <g style={{ animation: 'floatZSmall 4s ease-in-out infinite 2s' }} transformOrigin="61px 23px">
                         <path d="M 58 20 L 64 20 L 58 26 L 64 26" strokeWidth="2.5" />
                      </g>
                      
                      {/* Outer body contour */}
                      <path d="M 23 45 C 10 75 25 90 50 90 C 75 90 90 75 77 45" />

                      <g style={{ animation: 'owlBreathe 4s ease-in-out infinite' }}>
                        {/* Head contour */}
                        <path d="M 19 46 Q 16 28 26 18 Q 34 26 42 28 Q 50 30 58 28 Q 63 26 66 22" /> 
                        <path d="M 81 46 Q 84 28 74 18 Q 72 20 70 24" />

                        {/* Eyes (big circular rings) */}
                        <circle cx="35" cy="44" r="12" />
                        <circle cx="65" cy="44" r="12" />

                        {/* Sleepy closed eyes (inner curves) */}
                        <path d="M 28 44 Q 35 52 42 44" />
                        <path d="M 58 44 Q 65 52 72 44" />

                        {/* Beak */}
                        <path d="M 46 50 Q 50 47 54 50 L 50 57 Z" />
                      </g>

                      {/* Wings (inner body curves) */}
                      <path d="M 23 55 C 32 75 28 85 30 87" />
                      <path d="M 77 55 C 68 75 72 85 70 87" />

                      {/* Belly Feathers */}
                      <path d="M 38 68 Q 44 74 50 68 Q 56 74 62 68" />
                      <path d="M 44 76 Q 50 82 56 76" />

                      {/* Feet (toes) */}
                      <path d="M 38 88 L 38 94 M 43 88 L 43 94 M 48 88 L 48 94" />
                      <path d="M 52 88 L 52 94 M 57 88 L 57 94 M 62 88 L 62 94" />

                      {/* Branch / Perch */}
                      <path d="M 35 91 L 65 91" />
                  </g>
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
              {productCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-5 sm:px-6 py-2 sm:py-2.5 rounded-full border transition-all duration-300 text-sm sm:text-base ${
                    activeCategory === cat 
                      ? 'bg-white/20 text-white border-white font-medium' 
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
            <div className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
            <div className="hidden sm:block">
              &copy; {new Date().getFullYear()} SnackBox Inc.
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="text-white/40">
              v1.2.05
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
        cartTotalItems={cartTotalItems}
        upiId={upiId}
        cravePoints={cravePoints}
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
          <React.Suspense fallback={null}>
            <DevPage 
              products={productsList}
              setProducts={setProductsList}
              upiId={upiId}
              setUpiId={setUpiId}
              siteStatus={siteStatus === 'loading' ? 'live' : siteStatus}
              setSiteStatus={async (s) => {
                setSiteStatus(s);
                if (supabase) {
                  await supabase.from('payment_config').update({ qr_code_url: s }).eq('id', 'site_status');
                }
              }}
              onClose={() => setIsDevMode(false)}
            />
          </React.Suspense>
        )}
      </AnimatePresence>

      <OrderTracker 
        orders={trackedOrders} 
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        currentUser={currentUser}
        cravePoints={cravePoints}
        onClearOrder={(id) => {
          const newIds = [...dismissedOrderIds, id];
          localStorage.setItem('dismissed_orders', JSON.stringify(newIds));
          setDismissedOrderIds(newIds);
        }} 
      />
    </>
  );
}

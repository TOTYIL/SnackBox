import React, { useState, useEffect } from 'react';
import { Product, Order } from '../data';
import { Save, Plus, ArrowLeft, PackageSearch, CreditCard, ClipboardList, Edit2, Trash2, Check, X, RotateCcw, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface DevPageProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  qrCodeUrl: string;
  setQrCodeUrl: (url: string) => void;
  siteStatus: 'live' | 'offline';
  setSiteStatus: (s: 'live' | 'offline') => void;
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => void;
  onClose: () => void;
}

export const DevPage: React.FC<DevPageProps> = ({ products, setProducts, qrCodeUrl, setQrCodeUrl, siteStatus, setSiteStatus, orders, updateOrderStatus, onClose }) => {
  const [localProducts, setLocalProducts] = useState([...products]);
  const [localQr, setLocalQr] = useState(qrCodeUrl);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'payment'>('orders');

  
  // Real-time ticker for 1-hour expiration logic
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  // Computed Orders
  const HOUR_MS = 60 * 60 * 1000;
  const displayOrders = orders.map(o => {
    const age = now - new Date(o.date).getTime();
    const isOld = age > HOUR_MS;
    let computedStatus = o.status;
    
    // Auto-complete if > 1 hr and it's active
    if (isOld && (computedStatus === 'pending' || computedStatus === 'accepted')) {
      computedStatus = 'completed';
    }
    
    return { ...o, computedStatus, isOld };
  }).filter(o => !(o.computedStatus === 'rejected' && o.isOld)); // Auto-disappear rejected after 1 hr

  // Edit mode for inventory item
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const handleProductChange = (id: string, field: keyof Product, value: any) => {
    setLocalProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { 
          ...p, 
          [field]: field === 'price' ? (parseFloat(value) || 0) : field === 'stock' ? (parseInt(value) || 0) : value 
        };
      }
      return p;
    }));
  };

  const handleAddProduct = () => {
    const newId = `p${Date.now()}`;
    const newProd: Product = {
      id: newId,
      name: "New Snack",
      description: "Description",
      price: 0,
      category: "All",
      image: "https://images.unsplash.com/photo-1599598425947-33001bfce3df?auto=format&fit=crop&w=400&q=80",
      inStock: true,
      stock: 10
    };
    setLocalProducts([newProd, ...localProducts]);
    setEditingItemId(newId);
  };

  const handleRemoveProduct = async (id: string) => {
    setLocalProducts(prev => prev.filter(p => p.id !== id));
    setEditingItemId(null);
    if (supabase) {
      // First try to delete
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        // If it fails (likely due to foreign key order constraints), we just hide it by putting stock 0 or instock false
        console.error("Could not delete, maybe orders exist. Setting out of stock instead.");
        await supabase.from('products').update({ in_stock: false, stock: 0 }).eq('id', id);
      }
    }
  };

  const handleSaveInventory = async () => {
    setProducts(localProducts);
    setEditingItemId(null);
    if (!supabase) return;
    
    const { error } = await supabase.from('products').upsert(localProducts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      image: p.image,
      in_stock: p.inStock,
      stock: p.stock
    })));
  };

  const handleSavePayment = async () => {
    setQrCodeUrl(localQr);
    if (!supabase) return;
    
    const { error } = await supabase.from('payment_config').update({ qr_code_url: localQr }).eq('id', 'config');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#0f172a] z-50 overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
        
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8 pt-4">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 glass-button rounded-full shrink-0">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400">
              Developer Hub
            </h1>
          </div>
          
          {/* Tab Ribbon */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex flex-1 justify-center items-center gap-2 px-3 sm:px-5 py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base ${activeTab === 'orders' ? 'bg-white/10 text-white border-b-2 border-pink-400' : 'text-white/60 hover:text-white'}`}
            >
              <ClipboardList size={18} className="shrink-0" /> <span className="hidden sm:inline">Live Orders</span>
              {orders.length > 0 && (
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{orders.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`flex flex-1 justify-center items-center gap-2 px-3 sm:px-5 py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base ${activeTab === 'inventory' ? 'bg-white/10 text-white border-b-2 border-indigo-400' : 'text-white/60 hover:text-white'}`}
            >
              <PackageSearch size={18} className="shrink-0" /> <span className="hidden sm:inline">Inventory</span>
            </button>
            <button 
              onClick={() => setActiveTab('payment')}
              className={`flex flex-1 justify-center items-center gap-2 px-3 sm:px-5 py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base ${activeTab === 'payment' ? 'bg-white/10 text-white border-b-2 border-green-400' : 'text-white/60 hover:text-white'}`}
            >
              <CreditCard size={18} className="shrink-0" /> <span className="hidden sm:inline">Payment Config</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="pb-20">
          
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              {displayOrders.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                  <ClipboardList size={48} className="mx-auto text-white/20 mb-4" />
                  <p className="text-xl text-white/60">No pending orders yet.</p>
                </div>
              ) : (
                displayOrders.map(order => {
                  const statusColors = {
                    pending: 'bg-yellow-500/20 text-yellow-300',
                    accepted: 'bg-blue-500/20 text-blue-300',
                    completed: 'bg-green-500/20 text-green-300',
                    rejected: 'bg-red-500/20 text-red-300'
                  };
                  return (
                  <div key={order.id} className={`glass-panel p-5 sm:p-6 rounded-3xl border transition-all duration-500 flex flex-col md:flex-row gap-6 justify-between items-start ${order.computedStatus === 'rejected' ? 'border-white/5 bg-white/5 grayscale opacity-60' : 'border-white/20'}`}>
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex justify-between items-start border-b border-white/10 pb-4">
                        <div>
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            Order Code: <span className="text-pink-300 tracking-wider font-mono bg-pink-500/10 px-2 py-0.5 rounded-md">{order.id}</span>
                          </h3>
                          <p className="text-sm text-white/50">{new Date(order.date).toLocaleString()}</p>
                        </div>
                        <span className={`glass-pill px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusColors[order.computedStatus]}`}>
                          {order.computedStatus}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-white/50 mb-1">Customer</p>
                          <p className="font-medium text-sm">{order.customerName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 mb-1">Room</p>
                          <p className="font-medium text-sm text-pink-300">{order.room}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 mb-1">Phone</p>
                          <p className="font-medium text-sm">{order.phone}</p>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-xl p-4 mt-2">
                        <p className="text-xs text-white/50 mb-2">Items</p>
                        <ul className="space-y-2">
                          {order.items.map(item => (
                            <li key={item.id} className="flex justify-between text-sm">
                              <span><span className="text-white/50 mr-2">{item.quantity}x</span> {item.name}</span>
                              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-pink-300">₹{order.total.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      {!order.isOld && order.computedStatus !== 'completed' && (
                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
                          {order.computedStatus === 'pending' && (
                            <>
                              <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="flex items-center justify-center gap-2 flex-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition py-2.5 rounded-xl font-medium">
                                <Check size={16} /> Accept Order
                              </button>
                              <button onClick={() => updateOrderStatus(order.id, 'rejected')} className="flex items-center justify-center gap-2 flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 transition py-2.5 rounded-xl font-medium">
                                <X size={16} /> Reject
                              </button>
                            </>
                          )}
                          {order.computedStatus === 'accepted' && (
                            <>
                              <button onClick={() => updateOrderStatus(order.id, 'completed')} className="flex items-center justify-center gap-2 flex-1 bg-green-500/20 text-green-300 hover:bg-green-500/30 transition py-2.5 rounded-xl font-medium">
                                <Check size={16} /> Mark Completed
                              </button>
                              <button onClick={() => updateOrderStatus(order.id, 'rejected')} className="flex items-center justify-center gap-2 flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 transition py-2.5 rounded-xl font-medium">
                                <X size={16} /> Cancel Order
                              </button>
                            </>
                          )}
                          {order.computedStatus === 'rejected' && (
                            <button onClick={() => updateOrderStatus(order.id, 'pending')} className="flex items-center justify-center gap-2 flex-1 bg-white/10 text-white hover:bg-white/20 transition py-2.5 rounded-xl font-medium">
                              <RotateCcw size={16} /> Revert to Pending
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Completion Undo */}
                      {!order.isOld && order.computedStatus === 'completed' && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="flex items-center justify-center gap-2 w-full bg-white/5 text-white/70 hover:bg-white/10 transition py-2.5 rounded-xl font-medium">
                            <RotateCcw size={16} /> Undo Completion
                          </button>
                        </div>
                      )}
                      
                    </div>
                  </div>
                )})
              )}
            </motion.div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Manage Stock</h2>
                <div className="flex gap-3">
                  <button onClick={handleAddProduct} className="glass-button px-4 py-2 rounded-xl flex items-center gap-2 text-sm z-10 shrink-0">
                    <Plus size={16} /> Add Item
                  </button>
                  <button onClick={handleSaveInventory} className="bg-white text-black px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm z-10 hover:bg-gray-200 transition shrink-0">
                    <Save size={16} /> Save DB
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localProducts.map(product => (
                  <div key={product.id} className={`glass-panel p-4 rounded-3xl border transition-all ${editingItemId === product.id ? 'border-indigo-400 bg-white/10' : 'border-white/10'}`}>
                    
                    {editingItemId !== product.id ? (
                      // Display Mode Card
                      <div className="flex gap-4">
                        <img src={product.image} className="w-20 h-20 rounded-xl object-cover" alt={product.name} />
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                          <p className="text-xs text-white/50 mb-auto">{product.category} • ₹{product.price}</p>
                          <div className="flex justify-between items-end mt-2">
                             <div className="text-xs">
                               <span className="text-white/60 mr-1">Stock:</span> 
                               <span className={`font-bold ${product.stock === 0 ? 'text-red-400' : 'text-green-400'}`}>{product.stock}</span>
                             </div>
                             <button onClick={() => setEditingItemId(product.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                               <Edit2 size={16} />
                             </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Edit Mode Inline
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                           <span className="font-semibold text-indigo-300 text-sm">Editing Item</span>
                           <div className="flex gap-2">
                               <button onClick={() => handleRemoveProduct(product.id)} className="text-red-400 hover:bg-red-500/20 text-sm bg-red-500/10 px-3 py-1 rounded-lg flex items-center gap-1 transition">
                                   <Trash2 size={14}/> Remove
                               </button>
                               <button onClick={() => setEditingItemId(null)} className="text-white/50 hover:text-white text-sm bg-white/5 px-3 py-1 rounded-lg">Done</button>
                           </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">Name</label>
                          <input type="text" value={product.name} onChange={(e) => handleProductChange(product.id, 'name', e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">Price (₹)</label>
                            <input type="number" value={product.price} onChange={(e) => handleProductChange(product.id, 'price', e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">Stock Amount</label>
                            <input type="number" value={product.stock} onChange={(e) => handleProductChange(product.id, 'stock', e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">Category</label>
                          <input type="text" value={product.category} onChange={(e) => handleProductChange(product.id, 'category', e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">Image URL</label>
                          <input type="text" value={product.image} onChange={(e) => handleProductChange(product.id, 'image', e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">Description</label>
                          <textarea value={product.description} onChange={(e) => handleProductChange(product.id, 'description', e.target.value)} className="glass-input w-full p-2.5 rounded-xl text-sm resize-none h-20" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* PAYMENT TAB */}
          {activeTab === 'payment' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 sm:p-8 rounded-[2rem] max-w-2xl border border-white/20">
              <h2 className="text-2xl font-semibold mb-6">Site Configuration</h2>
              
              <div className="mb-10 p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                    <Power size={20} className={siteStatus === 'live' ? 'text-green-400' : 'text-red-400'} />
                    Site Status: {siteStatus === 'live' ? 'Live' : 'Offline'}
                  </h3>
                  <p className="text-sm text-white/50">When offline, customers see a sleeping owl and cannot place orders.</p>
                </div>
                <button
                  onClick={() => setSiteStatus(siteStatus === 'live' ? 'offline' : 'live')}
                  className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${siteStatus === 'live' ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-green-500 hover:bg-green-400 text-black'}`}
                >
                  {siteStatus === 'live' ? 'Go Offline' : 'Go Live'}
                </button>
              </div>

              <h2 className="text-2xl font-semibold mb-6">Payment Configuration</h2>
              <div className="mb-6">
                <label className="block text-sm text-white/70 mb-2 ml-2">UPI QR Code Image URL</label>
                <input 
                  type="text" 
                  value={localQr}
                  onChange={(e) => setLocalQr(e.target.value)}
                  className="glass-input w-full p-4 rounded-2xl bg-black/40"
                  placeholder="https://..."
                />
              </div>
              
              <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row gap-6 items-center">
                {localQr ? (
                  <img src={localQr} alt="QR Preview" className="w-32 h-32 rounded-xl object-cover bg-white" />
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-black/40 flex items-center justify-center text-white/30 text-xs text-center border border-dashed border-white/20">No QR Code Image</div>
                )}
                <div className="flex-1 text-sm text-white/60">
                  <p>This is the QR code that will be displayed to customers when they check out. Make sure it points to a valid UPI QR so you receive payments directly.</p>
                </div>
              </div>

              <button 
                onClick={handleSavePayment}
                className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black px-8 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 transition"
              >
                <Save size={18} /> Update Payment Settings
              </button>
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
};

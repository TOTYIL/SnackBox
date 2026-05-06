import React, { useState, useEffect, useRef } from "react";
import { Product, Order } from "../data";
import {
  Save,
  Plus,
  ArrowLeft,
  PackageSearch,
  CreditCard,
  ClipboardList,
  Edit2,
  Trash2,
  Check,
  X,
  RotateCcw,
  Power,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";

interface DevPageProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  upiId: string;
  setUpiId: (url: string) => void;
  siteStatus: "live" | "offline";
  setSiteStatus: (s: "live" | "offline") => void;
  onClose: () => void;
}

export const DevPage: React.FC<DevPageProps> = ({
  products,
  setProducts,
  upiId,
  setUpiId,
  siteStatus,
  setSiteStatus,
  onClose,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [localProducts, setLocalProducts] = useState([...products]);
  const [localQr, setLocalQr] = useState(upiId);
  const [activeTab, setActiveTab] = useState<
    "orders" | "inventory" | "payment"
  >("orders");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [clearingIds, setClearingIds] = useState<Record<string, boolean>>({});
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    // Restore orders once if needed
    if (!localStorage.getItem("admin_restored_test_order_3")) {
      localStorage.removeItem("admin_hidden_orders");
      localStorage.setItem("admin_restored_test_order_3", "true");
    }
  }, []);

  useEffect(() => {
    return () => {
      // Clear all timers on unmount to prevent leaks
      Object.entries(timeoutRefs.current).forEach(([id, timer]) => {
        clearTimeout(timer);
        deleteOrderImmediately(id);
      });
    };
  }, []);

  useEffect(() => {
    setLocalProducts((prev) => {
      if (!editingItemId) return [...products];

      let updated = prev.map((p) => {
        if (p.id === editingItemId) return p;
        const remote = products.find((rp) => rp.id === p.id);
        return remote || p;
      });

      const newProducts = products.filter(
        (p) => !updated.find((up) => up.id === p.id),
      );
      updated.push(...newProducts);

      updated = updated.filter(
        (p) => p.id === editingItemId || products.find((rp) => rp.id === p.id),
      );

      return updated;
    });
  }, [products, editingItemId]);

  useEffect(() => {
    setLocalQr(upiId);
  }, [upiId]);

  const fetchOrders = React.useCallback(async () => {
    if (!supabase) return;

    // As dev, fetch ALL orders!
    const { data: dbOrders, error } = await supabase
      .from("orders")
      .select(
        `
      *,
      order_items (*)
    `,
      )
      .order("date", { ascending: false });

    if (error) {
      console.error(
        "DEBUG RLS: Error fetching all orders. If you turned on RLS, you must create a policy that allows ANONYMOUS users to SELECT all orders if you want DevPage to work, or use Supabase Auth for the DevPage. Error:",
        error,
      );
    }

    if (dbOrders) {
      const hidden = JSON.parse(
        localStorage.getItem("admin_hidden_orders") || "[]",
      );
      const newOrders = dbOrders
        .filter((dbO) => !hidden.includes(dbO.id))
        .map((o) => {
          let actualRoom = o.room;
          let paymentMethod: "cod" | "prepaid" | undefined = undefined;
          if (o.payment_method) {
            paymentMethod = o.payment_method;
          } else if (typeof o.room === "string" && o.room.includes("||")) {
            const parts = o.room.split("||");
            actualRoom = parts[0];
            paymentMethod = parts[1] as any;
          }

          let statusToUse = o.status;
          if (!statusToUse) {
            const a = Date.now() - new Date(o.date).getTime();
            statusToUse = a > 15 * 60 * 1000 ? "unanswered" : "pending";
          }

          return {
            id: o.id,
            customerName: o.customer_name,
            room: actualRoom,
            phone: o.phone,
            paymentMethod,
            date: o.date,
            total: Number(o.total),
            status: statusToUse,
            items: o.order_items.map((oi: any) => ({
              id: oi.product_id,
              name: oi.name,
              price: Number(oi.price),
              quantity: oi.quantity,
            })),
          };
        });
      setOrders((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(newOrders)) return prev;
        return newOrders as Order[];
      });
    }
  }, []);

  const processingOrdersRef = useRef<Set<string>>(new Set());
  const recentlyUpdatedOrdersRef = useRef<
    Record<string, { status: Order["status"]; timestamp: number }>
  >({});

  const updateOrderStatus = async (
    orderId: string,
    status: Order["status"],
  ) => {
    if (processingOrdersRef.current.has(orderId)) return;

    const orderToUpdate = orders.find((o) => o.id === orderId);
    if (!orderToUpdate) return;

    // Check recent local override
    const recent = recentlyUpdatedOrdersRef.current[orderId];
    const actualOldStatus =
      recent && Date.now() - recent.timestamp < 10000
        ? recent.status
        : orderToUpdate.status;

    if (actualOldStatus === status) return;

    processingOrdersRef.current.add(orderId);

    try {
      recentlyUpdatedOrdersRef.current[orderId] = {
        status,
        timestamp: Date.now(),
      };
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );

      // Sync to Supabase immediately
      if (supabase) {
        const { error } = await supabase
          .from("orders")
          .update({ status })
          .eq("id", orderId);
        if (error) console.error("Error updating order status:", error);
      }

      // Handle stock changes
      const doUpdateStock = async (
        changes: { id: string; delta: number }[],
      ) => {
        setProducts(
          products.map((p) => {
            const change = changes.find((c) => c.id === p.id);
            if (change)
              return { ...p, stock: Math.max(0, p.stock + change.delta) };
            return p;
          }),
        );
        if (supabase) {
          for (const change of changes) {
            const { data, error } = await supabase
              .from("products")
              .select("stock")
              .eq("id", change.id)
              .single();
            if (error) console.error("Error fetching product stock:", error);
            if (data && data.stock !== undefined) {
              await supabase
                .from("products")
                .update({ stock: Math.max(0, data.stock + change.delta) })
                .eq("id", change.id);
            }
          }
        }
      };

      const stockIsDeducted = (s: Order["status"]) =>
        s === "accepted" || s === "completed";
      const oldDeducted = stockIsDeducted(actualOldStatus);
      const newDeducted = stockIsDeducted(status);

      if (!oldDeducted && newDeducted) {
        // Transitioned to Accepted/Completed: Deduct Stock
        await doUpdateStock(
          orderToUpdate.items.map((item) => ({
            id: item.id,
            delta: -item.quantity,
          })),
        );
      } else if (oldDeducted && !newDeducted) {
        // Transitioned to Pending/Rejected: Restore Stock
        await doUpdateStock(
          orderToUpdate.items.map((item) => ({
            id: item.id,
            delta: item.quantity,
          })),
        );
      }
    } finally {
      processingOrdersRef.current.delete(orderId);
    }
  };

  const deleteOrderImmediately = async (id: string) => {
    // Hide locally so it survives refreshes
    const hidden = JSON.parse(
      localStorage.getItem("admin_hidden_orders") || "[]",
    );
    if (!hidden.includes(id)) {
      hidden.push(id);
      localStorage.setItem("admin_hidden_orders", JSON.stringify(hidden));
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const deleteOrder = (id: string) => {
    setClearingIds((prev) => ({ ...prev, [id]: true }));
    timeoutRefs.current[id] = setTimeout(() => {
      deleteOrderImmediately(id);
      setClearingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete timeoutRefs.current[id];
    }, 5000);
  };

  const undoHideOrder = (id: string) => {
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
    setClearingIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  useEffect(() => {
    fetchOrders();

    let channel: any;
    if (supabase) {
      channel = supabase
        .channel("admin:orders")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => {
            fetchOrders();
          },
        )
        .subscribe();
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Real-time ticker for 1-hour expiration logic
  const [now, setNow] = useState(Date.now());
  const [rageTaps, setRageTaps] = useState<{ [orderId: string]: number }>({});
  const [deleteTaps, setDeleteTaps] = useState<{ [orderId: string]: number }>(
    {},
  );

  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({
    [new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })]: true,
  });
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const pendingOrdersCount = orders.filter(
    (o) => o.status === "pending",
  ).length;

  const hasPendingOrders = pendingOrdersCount > 0;

  useEffect(() => {
    let chimeInterval: any;

    // Function to play sound
    const playChime = () => {
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const playNote = (
            freq: number,
            startTime: number,
            duration: number,
          ) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            osc.start(startTime);
            osc.stop(startTime + duration);
          };

          const t = ctx.currentTime;
          playNote(523.25, t, 0.4); // C5
          playNote(659.25, t + 0.1, 0.4); // E5
          playNote(783.99, t + 0.2, 0.6); // G5
        }
      } catch (err) {
        console.error("Audio play failed", err);
      }
    };

    if (hasPendingOrders) {
      playChime(); // Play immediately when we go from 0 to >0
      chimeInterval = setInterval(playChime, 4000); // And then every 4 seconds
    }

    return () => {
      if (chimeInterval) clearInterval(chimeInterval);
    };
  }, [hasPendingOrders]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Computed Orders
  const HOUR_MS = 60 * 60 * 1000;
  const FIFTEEN_MIN_MS = 15 * 60 * 1000;

  useEffect(() => {
    // Auto-status updates to DB
    orders.forEach((o) => {
      const age = now - new Date(o.date).getTime();

      // Auto-mark pending as unanswered after 15 minutes
      if (o.status === "pending" && age > FIFTEEN_MIN_MS) {
        updateOrderStatus(o.id, "unanswered");
      }
      // Auto-complete accepted after 1 hr
      else if (o.status === "accepted" && age > HOUR_MS) {
        updateOrderStatus(o.id, "completed");
      }

      // Delete rejected or rage blocked permanently after roughly 30 minutes from creation
      // (assuming they were rejected some time in the first 15 mins)
      if (
        (o.status === "rejected" || o.status === "rage_blocked") &&
        age > FIFTEEN_MIN_MS * 2
      ) {
        deleteOrder(o.id);
      }

      // Clear out "unanswered" that are too old to prevent clutter (optional but good idea, let's say 24 hrs, but user only said to keep them until crossed)
    });
  }, [now, orders]);

  const displayOrders = orders.map((o) => {
    const age = now - new Date(o.date).getTime();
    return { ...o, computedStatus: o.status, age };
  });

  const liveOrders = displayOrders.filter(
    (o) =>
      o.computedStatus !== "completed" &&
      o.computedStatus !== "rejected" &&
      o.computedStatus !== "rage_blocked" &&
      o.computedStatus !== "unanswered",
  );

  const historyOrders = displayOrders.filter((o) => {
    // Show completed and unanswered. Hide rejected/rage_blocked if they are old (handled above anyway).
    // The user said: "i dont wan to see any rejected orders which were placed before current time"
    // So if it's already rejected and its age is > 15 mins, we just don't show it while waiting for the delete to go through.
    if (
      o.computedStatus === "rejected" ||
      o.computedStatus === "rage_blocked"
    ) {
      return o.age <= FIFTEEN_MIN_MS * 2;
    }
    return (
      o.computedStatus === "completed" || o.computedStatus === "unanswered"
    );
  });

  const historyByDate = historyOrders.reduce(
    (acc, order) => {
      const dateObj = new Date(order.date);
      const dateStr = dateObj.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(order);
      return acc;
    },
    {} as Record<string, typeof historyOrders>,
  );

  const sortedDates = Object.keys(historyByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setIsAllExpanded(false);
      setExpandedDates({
        [new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })]: true,
      });
    } else {
      setIsAllExpanded(true);
      const allExp: Record<string, boolean> = {};
      sortedDates.forEach((d) => (allExp[d] = true));
      setExpandedDates(allExp);
    }
  };

  const toggleDate = (dateStr: string) => {
    setExpandedDates((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  const handleProductChange = (
    id: string,
    field: keyof Product,
    value: any,
  ) => {
    const updated = localProducts.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          [field]:
            field === "price"
              ? parseFloat(value) || 0
              : field === "stock"
                ? parseInt(value) || 0
                : value,
        };
      }
      return p;
    });
    setLocalProducts(updated);
    setProducts(updated);
  };

  const handleSaveSingleProduct = async (id: string) => {
    setEditingItemId(null);
    if (!supabase) return;
    const p = localProducts.find((prod) => prod.id === id);
    if (p) {
      await supabase.from("products").upsert({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        image: p.image,
        in_stock: p.inStock,
        stock: p.stock,
      });
    }
  };

  const handleAddProduct = () => {
    const newId = `p${Date.now()}`;
    const newProd: Product = {
      id: newId,
      name: "New Snack",
      description: "Description",
      price: 0,
      category: "All",
      image:
        "https://images.unsplash.com/photo-1599598425947-33001bfce3df?auto=format&fit=crop&w=400&q=80",
      inStock: true,
      stock: 10,
    };
    setLocalProducts([newProd, ...localProducts]);
    setProducts([newProd, ...localProducts]);
    setEditingItemId(newId);
  };

  const handleRemoveProduct = async (id: string) => {
    const updated = localProducts.filter((p) => p.id !== id);
    setLocalProducts(updated);
    setProducts(updated);
    setEditingItemId(null);
    if (supabase) {
      // First try to delete
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        // If it fails (likely due to foreign key order constraints), we just hide it by putting stock -1
        console.warn(
          "Could not delete, maybe orders exist. Marking as deleted with stock -1.",
        );
        await supabase
          .from("products")
          .update({ in_stock: false, stock: -1 })
          .eq("id", id);
      }
    }
  };

  const handleSaveInventory = async () => {
    setProducts(localProducts);
    setEditingItemId(null);
    if (!supabase) return;

    const { error } = await supabase.from("products").upsert(
      localProducts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        image: p.image,
        in_stock: p.inStock,
        stock: p.stock,
      })),
    );
  };

  const handleSavePayment = async () => {
    setUpiId(localQr);
    if (!supabase) return;

    const { error } = await supabase
      .from("payment_config")
      .update({ qr_code_url: localQr })
      .eq("id", "config");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8 pt-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 glass-button rounded-full shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400">
              Developer Hub
            </h1>
          </div>

          {/* Tab Ribbon */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex flex-1 justify-center items-center gap-2 px-3 sm:px-5 py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base ${activeTab === "orders" ? "bg-white/10 text-white border-b-2 border-pink-400" : "text-white/60 hover:text-white"}`}
            >
              <ClipboardList size={18} className="shrink-0" />{" "}
              <span className="hidden sm:inline">Live Orders</span>
              {liveOrders.length > 0 && (
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                  {liveOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex flex-1 justify-center items-center gap-2 px-3 sm:px-5 py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base ${activeTab === "inventory" ? "bg-white/10 text-white border-b-2 border-indigo-400" : "text-white/60 hover:text-white"}`}
            >
              <PackageSearch size={18} className="shrink-0" />{" "}
              <span className="hidden sm:inline">Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`flex flex-1 justify-center items-center gap-2 px-3 sm:px-5 py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base ${activeTab === "payment" ? "bg-white/10 text-white border-b-2 border-green-400" : "text-white/60 hover:text-white"}`}
            >
              <CreditCard size={18} className="shrink-0" />{" "}
              <span className="hidden sm:inline">Payment Config</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="pb-20">
          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              {liveOrders.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                  <ClipboardList
                    size={48}
                    className="mx-auto text-white/20 mb-4"
                  />
                  <p className="text-xl text-white/60">
                    No live orders right now.
                  </p>
                </div>
              ) : (
                liveOrders.map((order) => {
                  const statusColors = {
                    pending: "bg-yellow-500/20 text-yellow-300",
                    accepted: "bg-blue-500/20 text-blue-300",
                    completed: "bg-green-500/20 text-green-300",
                    rejected: "bg-red-500/20 text-red-300",
                  };
                  return (
                    <div
                      key={order.id}
                      className={`glass-panel p-5 sm:p-6 rounded-3xl border transition-all duration-500 flex flex-col gap-6 justify-between items-start ${order.computedStatus === "rejected" ? "border-white/5 bg-white/5 grayscale opacity-60" : "border-white/20"}`}
                    >
                      <div className="flex-1 space-y-5 w-full">
                        <div className="flex justify-between items-start gap-4 border-b border-white/10 pb-4">
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold flex flex-wrap items-center gap-2">
                              <span>Order Code:</span>{" "}
                              <span className="text-pink-300 tracking-wider font-mono bg-pink-500/10 px-2 py-0.5 rounded-md break-all">
                                {order.id}
                              </span>
                            </h3>
                            <p className="text-sm text-white/50 mt-1">
                              {new Date(order.date).toLocaleString()}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <span
                              className={`glass-pill px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusColors[order.computedStatus]}`}
                            >
                              {order.computedStatus}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-white/50 mb-1">
                              Customer
                            </p>
                            <p className="font-medium text-sm">
                              {order.customerName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50 mb-1">Room</p>
                            <p className="font-medium text-sm text-pink-300">
                              {order.room}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50 mb-1">Phone</p>
                            <p className="font-medium text-sm">{order.phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50 mb-1">
                              Payment
                            </p>
                            <p className="font-medium text-[11px] sm:text-xs text-indigo-300 uppercase">
                              {order.paymentMethod === "prepaid"
                                ? "Prepaid (Pay Now)"
                                : order.paymentMethod === "cod"
                                  ? "Cash on Delivery (COD)"
                                  : "Not Specified"}
                            </p>
                          </div>
                        </div>

                        <div className="bg-black/30 rounded-xl p-4 mt-2">
                          <p className="text-xs text-white/50 mb-2">Items</p>
                          <ul className="space-y-2">
                            {order.items.map((item) => (
                              <li
                                key={item.id}
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  <span className="text-white/50 mr-2">
                                    {item.quantity}x
                                  </span>{" "}
                                  {item.name}
                                </span>
                                <span>
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 pt-3 border-t border-white/10 flex justify-between font-bold">
                            <span>Total</span>
                            <span className="text-pink-300">
                              ₹{order.total.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {!order.isOld &&
                          order.computedStatus !== "completed" && (
                            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
                              {order.computedStatus === "pending" && (
                                <>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "accepted")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition py-2.5 rounded-xl font-medium"
                                  >
                                    <Check size={16} /> Accept Order
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "rejected")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 transition py-2.5 rounded-xl font-medium"
                                  >
                                    <X size={16} /> Reject
                                  </button>
                                  <button
                                    onClick={() => {
                                      const taps =
                                        (rageTaps[order.id] || 0) + 1;
                                      if (taps >= 5) {
                                        setRageTaps((prev) => ({
                                          ...prev,
                                          [order.id]: 0,
                                        }));
                                        updateOrderStatus(
                                          order.id,
                                          "rage_blocked",
                                        );
                                      } else {
                                        setRageTaps((prev) => ({
                                          ...prev,
                                          [order.id]: taps,
                                        }));
                                      }
                                    }}
                                    className="flex items-center justify-center w-full px-2 py-1 text-xs text-transparent hover:text-white/20 transition-colors"
                                  >
                                    Cock Sucker Mode
                                  </button>
                                </>
                              )}
                              {order.computedStatus === "accepted" && (
                                <>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "completed")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 bg-green-500/20 text-green-300 hover:bg-green-500/30 transition py-2.5 rounded-xl font-medium"
                                  >
                                    <Check size={16} /> Mark Completed
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "rejected")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 transition py-2.5 rounded-xl font-medium"
                                  >
                                    <X size={16} /> Cancel Order
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "pending")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 bg-white/10 text-white hover:bg-white/20 transition py-2.5 rounded-xl font-medium w-full"
                                  >
                                    <RotateCcw size={16} /> Undo Accept
                                  </button>
                                </>
                              )}
                              {order.computedStatus === "rejected" && (
                                <button
                                  onClick={() =>
                                    updateOrderStatus(order.id, "pending")
                                  }
                                  className="flex items-center justify-center gap-2 w-full bg-white/10 text-white hover:bg-white/20 transition py-2.5 rounded-xl font-medium"
                                >
                                  <RotateCcw size={16} /> Revert to Pending
                                </button>
                              )}
                            </div>
                          )}

                        {/* Completion Undo */}
                        {!order.isOld &&
                          order.computedStatus === "completed" && (
                            <div>
                              <button
                                onClick={() =>
                                  updateOrderStatus(order.id, "accepted")
                                }
                                className="flex items-center justify-center gap-2 w-full bg-white/5 text-white/70 hover:bg-white/10 transition py-2.5 rounded-xl font-medium"
                              >
                                <RotateCcw size={16} /> Undo Completion
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* History below Live Orders */}
              {historyOrders.length > 0 && (
                <div className="mt-12">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                    <h3 className="text-xl font-bold text-white/50">History</h3>
                    <button
                      onClick={toggleExpandAll}
                      className="text-xs font-medium text-white/50 hover:text-white transition flex items-center gap-1"
                    >
                      {isAllExpanded ? (
                        <Minimize2 size={14} />
                      ) : (
                        <Maximize2 size={14} />
                      )}
                      {isAllExpanded ? "Collapse All" : "Expand All"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-6">
                    {sortedDates.map((dateStr) => {
                      const isExpanded = expandedDates[dateStr];
                      const dateOrders = historyByDate[dateStr];

                      return (
                        <div
                          key={dateStr}
                          className="bg-white/5 rounded-2xl overflow-hidden border border-white/10"
                        >
                          {/* Header Tile */}
                          <button
                            onClick={() => toggleDate(dateStr)}
                            className="w-full flex justify-between items-center p-4 hover:bg-white/5 transition text-left"
                          >
                            <div>
                              <h4 className="font-bold text-white/90">
                                {dateStr ===
                                new Date().toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                                  ? "Today"
                                  : dateStr}
                              </h4>
                              <p className="text-xs text-white/50">
                                {dateOrders.length} order
                                {dateOrders.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="text-white/40">
                              {isExpanded ? (
                                <ChevronUp size={20} />
                              ) : (
                                <ChevronDown size={20} />
                              )}
                            </div>
                          </button>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-white/10"
                              >
                                <div className="p-2 sm:p-6 flex flex-col gap-8 bg-black/20">
                                  {dateOrders.map((order) => {
                                    const statusColors: Record<string, string> =
                                      {
                                        pending:
                                          "bg-yellow-500/20 text-yellow-300",
                                        accepted:
                                          "bg-blue-500/20 text-blue-300",
                                        completed:
                                          "bg-green-500/20 text-green-300",
                                        rejected: "bg-red-500/20 text-red-300",
                                        unanswered:
                                          "bg-orange-500/20 text-orange-300",
                                        rage_blocked:
                                          "bg-red-500/20 text-red-300",
                                      };
                                    return (
                                      <div
                                        key={order.id}
                                        className={`bg-white/5 p-6 sm:p-8 mb-4 rounded-3xl border-0 transition-all duration-500 flex flex-col md:flex-row gap-8 justify-between items-start shadow-none relative overflow-hidden ${order.computedStatus === "rejected" ? "grayscale opacity-50" : "opacity-80"}`}
                                      >
                                        {clearingIds[order.id] && (
                                          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
                                            <h3 className="text-white font-bold mb-4">
                                              Order Dismissed
                                            </h3>
                                            <button
                                              onClick={() =>
                                                undoHideOrder(order.id)
                                              }
                                              className="bg-white/10 hover:bg-white text-white hover:text-black py-2 px-6 rounded-full font-bold transition-all w-fit min-w-[200px] relative overflow-hidden group/undo"
                                            >
                                              <span className="relative z-10">
                                                Undo
                                              </span>
                                              <motion.div
                                                initial={{ width: "100%" }}
                                                animate={{ width: "0%" }}
                                                transition={{
                                                  duration: 5,
                                                  ease: "linear",
                                                }}
                                                className="absolute bottom-0 left-0 h-1 bg-pink-500/50"
                                              />
                                            </button>
                                          </div>
                                        )}
                                        <div className="flex-1 space-y-5 w-full relative z-10">
                                          <div className="flex justify-between items-start gap-4 border-b border-white/10 pb-4">
                                            <div className="min-w-0">
                                              <h3 className="text-lg font-bold flex flex-wrap items-center gap-2">
                                                <span>Order Code:</span>{" "}
                                                <span className="text-white/70 font-mono text-sm break-all">
                                                  {order.id}
                                                </span>
                                              </h3>
                                              <p className="text-sm text-white/50 mt-1">
                                                {new Date(
                                                  order.date,
                                                ).toLocaleString()}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <span
                                                className={`glass-pill px-3 py-1 text-xs font-semibold uppercase tracking-wider ${/*ts-ignore*/ statusColors[order.computedStatus]}`}
                                              >
                                                {order.computedStatus}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  deleteOrder(order.id)
                                                }
                                                className="text-white/30 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full"
                                                title="Delete Order"
                                              >
                                                <X size={16} />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                              <p className="text-xs text-white/50 mb-1">
                                                Customer
                                              </p>
                                              <p className="font-medium text-sm">
                                                {order.customerName}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-white/50 mb-1">
                                                Room
                                              </p>
                                              <p className="font-medium text-sm text-white/80">
                                                {order.room}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-white/50 mb-1">
                                                Phone
                                              </p>
                                              <p className="font-medium text-sm">
                                                {order.phone}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-white/50 mb-1">
                                                Payment
                                              </p>
                                              <p className="font-medium text-[11px] sm:text-xs text-white/80 uppercase">
                                                {order.paymentMethod ===
                                                "prepaid"
                                                  ? "Prepaid (Pay Now)"
                                                  : order.paymentMethod ===
                                                      "cod"
                                                    ? "Cash on Delivery (COD)"
                                                    : "Not Specified"}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="bg-black/30 rounded-xl p-4 mt-2">
                                            <p className="text-xs text-white/50 mb-2">
                                              Items
                                            </p>
                                            <ul className="space-y-2">
                                              {order.items.map((item) => (
                                                <li
                                                  key={item.id}
                                                  className="flex justify-between text-sm text-white/70"
                                                >
                                                  <span>
                                                    <span className="text-white/50 mr-2">
                                                      {item.quantity}x
                                                    </span>{" "}
                                                    {item.name}
                                                  </span>
                                                  <span>
                                                    ₹
                                                    {(
                                                      item.price * item.quantity
                                                    ).toFixed(2)}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between font-bold">
                                              <span>Total</span>
                                              <span className="text-white/80">
                                                ₹{order.total.toFixed(2)}
                                              </span>
                                            </div>
                                          </div>

                                          {/* History Action Buttons */}
                                          {order.computedStatus ===
                                            "rage_blocked" && (
                                            <div className="mt-4 p-4 border border-red-500/50 bg-red-500/20 rounded-xl flex justify-between items-center">
                                              <p className="text-red-400 font-bold text-sm uppercase flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                Cock Sucker Found
                                              </p>
                                              <button
                                                onClick={() => {
                                                  updateOrderStatus(
                                                    order.id,
                                                    "rejected",
                                                  ); // Close mode
                                                }}
                                                className="bg-red-600/50 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
                                              >
                                                Forgive
                                              </button>
                                            </div>
                                          )}
                                          {(order.computedStatus ===
                                            "completed" ||
                                            order.computedStatus ===
                                              "expired" ||
                                            order.computedStatus ===
                                              "rejected") && (
                                            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                                              {!order.isOld &&
                                                order.computedStatus ===
                                                  "completed" && (
                                                  <button
                                                    onClick={() =>
                                                      updateOrderStatus(
                                                        order.id,
                                                        "accepted",
                                                      )
                                                    }
                                                    className="flex items-center justify-center gap-2 w-full bg-white/5 text-white/70 hover:bg-white/10 transition py-2.5 rounded-xl font-medium"
                                                  >
                                                    <RotateCcw size={16} /> Undo
                                                    Completion
                                                  </button>
                                                )}
                                              {!order.isOld &&
                                                order.computedStatus ===
                                                  "rejected" && (
                                                  <button
                                                    onClick={() =>
                                                      updateOrderStatus(
                                                        order.id,
                                                        "pending",
                                                      )
                                                    }
                                                    className="flex items-center justify-center gap-2 w-full bg-white/5 text-white/70 hover:bg-white/10 transition py-2.5 rounded-xl font-medium"
                                                  >
                                                    <RotateCcw size={16} /> Undo
                                                    Reject
                                                  </button>
                                                )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === "inventory" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Manage Stock</h2>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddProduct}
                    className="glass-button px-4 py-2 rounded-xl flex items-center gap-2 text-sm z-10 shrink-0"
                  >
                    <Plus size={16} /> Add Item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`glass-panel p-4 rounded-3xl border transition-all ${editingItemId === product.id ? "border-indigo-400 bg-white/10" : "border-white/10"}`}
                  >
                    {editingItemId !== product.id ? (
                      // Display Mode Card
                      <div className="flex gap-4">
                        <img
                          src={product.image}
                          className="w-20 h-20 rounded-xl object-cover"
                          alt={product.name}
                        />
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h3 className="font-semibold line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-xs text-white/50 mb-auto">
                            {product.category} • ₹{product.price}
                          </p>
                          <div className="flex justify-between items-end mt-2">
                            <div className="text-xs">
                              <span className="text-white/60 mr-1">Stock:</span>
                              <span
                                className={`font-bold ${product.stock === 0 ? "text-red-400" : "text-green-400"}`}
                              >
                                {product.stock}
                              </span>
                            </div>
                            <button
                              onClick={() => setEditingItemId(product.id)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Edit Mode Inline
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                          <span className="font-semibold text-indigo-300 text-sm">
                            Editing Item
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRemoveProduct(product.id)}
                              className="text-red-400 hover:bg-red-500/20 text-sm bg-red-500/10 px-3 py-1 rounded-lg flex items-center gap-1 transition"
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                            <button
                              onClick={() =>
                                handleSaveSingleProduct(product.id)
                              }
                              className="text-white/50 hover:text-white text-sm bg-white/5 px-3 py-1 rounded-lg"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                "name",
                                e.target.value,
                              )
                            }
                            className="glass-input w-full p-2.5 rounded-xl text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">
                              Price (₹)
                            </label>
                            <input
                              type="number"
                              value={product.price}
                              onChange={(e) =>
                                handleProductChange(
                                  product.id,
                                  "price",
                                  e.target.value,
                                )
                              }
                              className="glass-input w-full p-2.5 rounded-xl text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">
                              Stock Amount
                            </label>
                            <input
                              type="number"
                              value={product.stock}
                              onChange={(e) =>
                                handleProductChange(
                                  product.id,
                                  "stock",
                                  e.target.value,
                                )
                              }
                              className="glass-input w-full p-2.5 rounded-xl text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">
                            Category
                          </label>
                          <input
                            type="text"
                            value={product.category}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                "category",
                                e.target.value,
                              )
                            }
                            className="glass-input w-full p-2.5 rounded-xl text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">
                            Image URL
                          </label>
                          <input
                            type="text"
                            value={product.image}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                "image",
                                e.target.value,
                              )
                            }
                            className="glass-input w-full p-2.5 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1">
                            Description
                          </label>
                          <textarea
                            value={product.description}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                "description",
                                e.target.value,
                              )
                            }
                            className="glass-input w-full p-2.5 rounded-xl text-sm resize-none h-20"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* PAYMENT TAB */}
          {activeTab === "payment" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div className="glass-panel w-full p-6 sm:p-8 rounded-[2rem] max-w-2xl border border-white/20">
                <h2 className="text-2xl font-semibold mb-6">
                  Site Configuration
                </h2>

                <div className="mb-10 p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                      <Power
                        size={20}
                        className={
                          siteStatus === "live"
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      />
                      Site Status: {siteStatus === "live" ? "Live" : "Offline"}
                    </h3>
                    <p className="text-sm text-white/50">
                      When offline, customers see a sleeping owl and cannot
                      place orders.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSiteStatus(siteStatus === "live" ? "offline" : "live")
                    }
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${siteStatus === "live" ? "bg-red-500 hover:bg-red-400 text-white" : "bg-green-500 hover:bg-green-400 text-black"}`}
                  >
                    {siteStatus === "live" ? "Go Offline" : "Go Live"}
                  </button>
                </div>

                <h2 className="text-2xl font-semibold mb-6">
                  Payment Configuration
                </h2>
                <div className="mb-6">
                  <label className="block text-sm text-white/70 mb-2 ml-2">
                    Your UPI ID
                  </label>
                  <input
                    type="text"
                    value={localQr}
                    onChange={(e) => setLocalQr(e.target.value)}
                    className="glass-input w-full p-4 rounded-2xl bg-black/40"
                    placeholder="e.g. nhempire1717-3@oksbi"
                  />
                </div>

                <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row gap-6 items-center">
                  <div className="flex-1 text-sm text-white/60">
                    <p>
                      Your UPI ID will be used to generate a dynamic UPI QR Code
                      on the checkout screen with the exact exact amount
                      required.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSavePayment}
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black px-8 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 transition"
                >
                  <Save size={18} /> Update Payment Settings
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

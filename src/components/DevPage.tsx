import React, { useState, useEffect, useRef, useMemo } from "react";
import { Product, Order, MainCategory } from "../data";
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
  BarChart3,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { EditOrderModal } from "./EditOrderModal";

interface DevPageProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  mainCategories: MainCategory[];
  setMainCategories: (categories: MainCategory[]) => void;
  upiId: string;
  setUpiId: (url: string) => void;
  siteStatus: "live" | "offline";
  setSiteStatus: (s: "live" | "offline") => void;
  onClose: () => void;
  currentUser?: { id: string; username: string; } | null;
  onUpdateOrderItems?: (orderId: string, newItems: any[], newTotal: number) => Promise<void>;
}

export const DevPage: React.FC<DevPageProps> = ({
  products,
  setProducts,
  mainCategories,
  setMainCategories,
  upiId,
  setUpiId,
  siteStatus,
  setSiteStatus,
  onClose,
  currentUser,
  onUpdateOrderItems,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [localProducts, setLocalProducts] = useState([...products]);
  const [costPrices, setCostPrices] = useState<Record<string, any>>({});
  const [lowStockThresholds, setLowStockThresholds] = useState<Record<string, number>>({});
  const [appUsers, setAppUsers] = useState<Record<string, string>>({});
  const [localQr, setLocalQr] = useState(upiId);
  const [activeTab, setActiveTab] = useState<
    "orders" | "inventory" | "payment" | "analytics" | "logs"
  >("orders");
  const [creatingMainCatForProduct, setCreatingMainCatForProduct] = useState<string | null>(null);
  const [newMainCatInput, setNewMainCatInput] = useState("");
  const [renamingMainCatForProduct, setRenamingMainCatForProduct] = useState<{ productId: string; mcId: string } | null>(null);
  const [renameMainCatInput, setRenameMainCatInput] = useState("");
  const [draftMainCatByProduct, setDraftMainCatByProduct] = useState<Record<string, string>>({});
  const [draftMainCatTouched, setDraftMainCatTouched] = useState<Record<string, boolean>>({});
  const [developerLogs, setDeveloperLogs] = useState<any[]>([]);
  const [analyticsView, setAnalyticsView] = useState<
    "overview" | "revenue" | "profit" | "items" | "users" | "low_stock"
  >("overview");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (supabase) {
      supabase.from("payment_config").select("qr_code_url").eq("id", "cost_prices").single().then(({data}) => {
        if (data && data.qr_code_url) {
          try {
            const parsed = JSON.parse(data.qr_code_url);
            setCostPrices(parsed);
          } catch(e) {}
        }
      });
      supabase.from("payment_config").select("qr_code_url").eq("id", "low_stock_thresholds").single().then(({data}) => {
        if (data && data.qr_code_url) {
          try {
            const parsed = JSON.parse(data.qr_code_url);
            setLowStockThresholds(parsed);
          } catch(e) {}
        }
      });
      supabase.from("app_users").select("id, username, created_at").then(({data, error}) => {
        if (error) {
          console.error("Error fetching app_users:", error);
        }
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((u: any) => map[u.id] = u.username);
          setAppUsers(map);
        }
      });
      supabase.from("payment_config").select("qr_code_url").eq("id", "developer_logs").single().then(({data}) => {
        if (data && data.qr_code_url) {
           try {
             setDeveloperLogs(JSON.parse(data.qr_code_url));
           } catch(e) {}
        }
      });
    }
  }, [supabase]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Record<string, boolean>>({});
  const [clearingIds, setClearingIds] = useState<Record<string, boolean>>({});
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
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
        clearTimeout(timer as any);
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
          let pointsUsed = 0;
          if (o.payment_method) {
            paymentMethod = o.payment_method;
          }
          if (typeof o.room === "string" && o.room.includes("||")) {
            const parts = o.room.split("||");
            actualRoom = parts[0];
            parts.slice(1).forEach((part: string) => {
              if (!paymentMethod && (part === "cod" || part === "prepaid")) {
                paymentMethod = part as any;
              } else if (part.startsWith("P:")) {
                pointsUsed = Number(part.substring(2));
              }
            });
          }

          let statusToUse = o.status;
          
          const recent = recentlyUpdatedOrdersRef.current[o.id];
          if (recent && Date.now() - recent.timestamp < 10000) {
            statusToUse = recent.status;
          } else if (!statusToUse) {
            const a = Date.now() - new Date(o.date).getTime();
            statusToUse = a > 15 * 60 * 1000 ? "unanswered" : "pending";
          }

          const itemsMap: Record<string, any> = {};
          o.order_items.forEach((oi: any) => {
            if (itemsMap[oi.product_id]) {
              itemsMap[oi.product_id].quantity += oi.quantity;
            } else {
              itemsMap[oi.product_id] = {
                id: oi.product_id,
                name: oi.name,
                price: Number(oi.price),
                quantity: oi.quantity,
              };
            }
          });
          const items = Object.values(itemsMap);

          const cartTotalItems = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
          const subtotal = items.reduce((acc, item: any) => acc + item.price * item.quantity, 0);
          const prepaidDiscount = 0;
          const cravePointsDisabled = o.crave_points_disabled === true || (typeof o.room === "string" && o.room.includes("||C:NO"));
          const shakeSeen = typeof o.room === "string" && o.room.includes("||S:OK");
          const recentPay = recentlyUpdatedPaymentRef.current[o.id];
          const paymentVerified =
            recentPay && Date.now() - recentPay.timestamp < 10000
              ? recentPay.verified
              : o.payment_verified === true || (typeof o.room === "string" && o.room.includes("||V:OK"));

          let serviceCharge = 0;
          if (typeof actualRoom === "string" && actualRoom.includes(" - ") && !actualRoom.startsWith("Gaumukh")) {
            serviceCharge = 30;
          }

          const calculatedTotal = Math.max(0, (o.total !== undefined && o.total !== null ? Number(o.total) : subtotal) + serviceCharge - pointsUsed - prepaidDiscount);

          return {
            id: o.id,
            userId: o.user_id,
            customerName: o.customer_name,
            room: actualRoom,
            dbRoom: o.room,
            phone: o.phone,
            paymentMethod,
            pointsUsed,
            prepaidDiscount,
            serviceCharge,
            cravePointsDisabled,
            shakeSeen,
            paymentVerified,
            date: o.date,
            total: calculatedTotal,
            status: statusToUse,
            items,
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
  const recentlyUpdatedPaymentRef = useRef<
    Record<string, { verified: boolean; timestamp: number }>
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
      logAction("update_order_status", { orderId, oldStatus: actualOldStatus, newStatus: status });
      recentlyUpdatedOrdersRef.current[orderId] = {
        status,
        timestamp: Date.now(),
      };
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );

      // Sync to Supabase in the background
      if (supabase) {
        supabase
          .from("orders")
          .update({ status })
          .eq("id", orderId)
          .then(({ error }) => {
            if (error) {
              console.error("Error updating order status:", error);
              // Revert
              delete recentlyUpdatedOrdersRef.current[orderId];
              setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: actualOldStatus } : o)),
              );
            }
          });
      }

      // Handle stock changes
      const doUpdateStock = async (
        changes: { id: string; delta: number }[],
      ) => {
        setProducts((prev) =>
          prev.map((p) => {
            const change = changes.find((c) => c.id === p.id);
            if (change)
              return { ...p, stock: Math.max(0, p.stock + change.delta) };
            return p;
          }),
        );
        if (supabase) {
          try {
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
          } catch (e) {
            console.error("Stock update error:", e);
          }
        }
      };

      const stockIsDeducted = (s: Order["status"]) =>
        s === "accepted" || s === "completed";
      const oldDeducted = stockIsDeducted(actualOldStatus);
      const newDeducted = stockIsDeducted(status);

      if (!oldDeducted && newDeducted) {
        // Transitioned to Accepted/Completed: Deduct Stock
        doUpdateStock(
          orderToUpdate.items.map((item) => ({
            id: item.id,
            delta: -item.quantity,
          })),
        );
      } else if (oldDeducted && !newDeducted) {
        // Transitioned to Pending/Rejected: Restore Stock
        doUpdateStock(
          orderToUpdate.items.map((item) => ({
            id: item.id,
            delta: item.quantity,
          })),
        );
      }
    } finally {
      // Free it up immediately so they can click again if needed
      setTimeout(() => processingOrdersRef.current.delete(orderId), 100);
    }
  };

  const handleToggleCraveCandies = async (orderId: string, currentDbRoom: string) => {
    if (!supabase) return;
    const isDisabled = currentDbRoom.includes("||C:NO");
    let newDbRoom = currentDbRoom;
    if (isDisabled) {
      newDbRoom = currentDbRoom.split("||C:NO").join("");
    } else {
      newDbRoom = currentDbRoom + "||C:NO";
    }

    logAction("toggle_crave_candies", { orderId, isDisabled: !isDisabled, newDbRoom });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, dbRoom: newDbRoom, cravePointsDisabled: !isDisabled } : o));

    await supabase.from("orders").update({ room: newDbRoom }).eq("id", orderId);
  };

  const handleSetPaymentVerified = async (
    orderId: string,
    currentDbRoom: string,
    verified: boolean,
  ) => {
    const cleanBase = (currentDbRoom || "").split("||V:OK").join("");
    const newDbRoom = verified ? `${cleanBase}||V:OK` : cleanBase;

    recentlyUpdatedPaymentRef.current[orderId] = {
      verified,
      timestamp: Date.now(),
    };
    logAction("toggle_payment_verified", { orderId, verified, newDbRoom });
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, dbRoom: newDbRoom, paymentVerified: verified }
          : o,
      ),
    );

    if (supabase) {
      await supabase.from("orders").update({ room: newDbRoom }).eq("id", orderId);
    }
  };

  const handleShakeSeen = async (orderId: string, currentDbRoom: string | undefined) => {
    let base = currentDbRoom || "";
    if (!base.includes("||S:OK")) {
        const newDbRoom = base + "||S:OK";
        logAction("shake_seen", { orderId, newDbRoom });
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, dbRoom: newDbRoom, shakeSeen: true } : o));
        if (supabase) {
           await supabase.from("orders").update({ room: newDbRoom }).eq("id", orderId);
        }
    }
  };

  const deleteOrderImmediately = async (id: string) => {
    logAction("delete_order", { id });
    // Also delete from Supabase using the secure RPC so spam is actually removed
    if (supabase) {
      await supabase.rpc("admin_delete_order", {
        p_username: "Totyil",
        p_password: "snackdev2403",
        p_order_id: id,
      });
    }
    // Hide locally so it survives refreshes faster
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

    // Fallback polling for robust updates
    const interval = setInterval(() => {
      fetchOrders();
    }, 2000);

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Real-time ticker for 1-hour expiration logic
  const [now, setNow] = useState(Date.now());
  const [rageTaps, setRageTaps] = useState<{ [orderId: string]: number }>({});
  const [deleteTaps, setDeleteTaps] = useState<{ [orderId: string]: number }>(
    {},
  );
  const [analyticsTimeline, setAnalyticsTimeline] = useState<string>("all");

  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({
    [new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })]: true,
  });
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const pendingOrdersCount = orders.filter((o) => {
    // Only count as "new" for the notification chime if it is less than 12 hours old
    const age = Date.now() - new Date(o.date).getTime();
    if (age > 12 * 60 * 60 * 1000) return false;

    return o.status === "pending";
  }).length;

  const hasPendingOrders = pendingOrdersCount > 0;

  const [showNotification, setShowNotification] = useState(false);

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

          const doPlay = () => {
            const t = ctx.currentTime;
            playNote(523.25, t, 0.4); // C5
            playNote(659.25, t + 0.1, 0.4); // E5
            playNote(783.99, t + 0.2, 0.6); // G5
          };

          if (ctx.state === 'suspended') {
            const resumeAndPlay = () => {
              ctx.resume().then(() => {
                doPlay();
                window.removeEventListener('click', resumeAndPlay);
                window.removeEventListener('keydown', resumeAndPlay);
                window.removeEventListener('touchstart', resumeAndPlay);
              });
            };
            window.addEventListener('click', resumeAndPlay);
            window.addEventListener('keydown', resumeAndPlay);
            window.addEventListener('touchstart', resumeAndPlay);
          } else {
            doPlay();
          }
        }
      } catch (err) {
        console.error("Audio play failed", err);
      }
    };

    if (hasPendingOrders) {
      setShowNotification(true);
      playChime(); // Play immediately when we go from 0 to >0
      chimeInterval = setInterval(playChime, 1500); // And then every 1.5 seconds
    } else {
      setShowNotification(false);
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

  const handleToggleListed = async (id: string, currentListed: boolean) => {
    const updated = localProducts.map((p) => {
      if (p.id === id) {
        return { ...p, isListed: !currentListed };
      }
      return p;
    });
    setLocalProducts(updated);
    setProducts(updated);
    
    if (!supabase) return;
    const p = updated.find((prod) => prod.id === id);
    if (p) {
      logAction("toggle_product_listed", { id, isListed: p.isListed });
      await supabase.from("products").upsert({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.isListed === false ? `_UNLISTED_${p.category}` : p.category,
        image: p.image,
        in_stock: p.inStock,
        stock: p.stock,
      });
    }
  };

  const handleSaveSingleProduct = async (id: string) => {
    const existingProd = localProducts.find((prod) => prod.id === id);
    if (!existingProd) {
      setEditingItemId(null);
      return;
    }

    let latestMainCats = [...mainCategories];
    let targetMcId =
      draftMainCatByProduct[id] !== undefined
        ? draftMainCatByProduct[id]
        : getMainCategoryForSub(existingProd.category)?.id || "";

    // If user typed a new main category name without clicking the checkmark, create it on Done
    if (creatingMainCatForProduct === id && newMainCatInput.trim()) {
      const trimmedNewMc = newMainCatInput.trim();
      const existingMc = latestMainCats.find(
        (mc) => mc.name.trim().toLowerCase() === trimmedNewMc.toLowerCase(),
      );
      if (existingMc) {
        targetMcId = existingMc.id;
      } else {
        const newMc: MainCategory = {
          id: `mc_${Date.now()}`,
          name: trimmedNewMc,
          subCategories: [],
        };
        latestMainCats = [...latestMainCats, newMc];
        targetMcId = newMc.id;
      }
    }

    let finalSubCat = (existingProd.category || "").trim();
    if ((!finalSubCat || finalSubCat.toLowerCase() === "all") && targetMcId) {
      const chosenMc = latestMainCats.find((mc) => mc.id === targetMcId);
      if (chosenMc) {
        finalSubCat = chosenMc.name;
      }
    }

    const updatedProduct: Product = {
      ...existingProd,
      category: finalSubCat,
    };

    // Update product state synchronously
    const nextProducts = localProducts.map((prod) =>
      prod.id === id ? updatedProduct : prod,
    );
    setLocalProducts(nextProducts);
    setProducts(nextProducts);

    // Update mainCategories synchronously so the item moves to its new section immediately
    let updatedMainCats = latestMainCats;
    const subKey = normalizeSubKey(finalSubCat);
    if (subKey && subKey !== "all") {
      updatedMainCats = latestMainCats.map((mc) => {
        const filtered = (mc.subCategories || []).filter(
          (s) => normalizeSubKey(s) !== subKey,
        );
        if (mc.id === targetMcId) {
          return { ...mc, subCategories: [...filtered, finalSubCat] };
        }
        return { ...mc, subCategories: filtered };
      });
    }

    const catsChanged =
      JSON.stringify(updatedMainCats) !== JSON.stringify(mainCategories);
    if (catsChanged) {
      localStorage.setItem("snackbox_cat_updated_at", String(Date.now()));
      setMainCategories(updatedMainCats);
      localStorage.setItem(
        "snackbox_main_categories",
        JSON.stringify(updatedMainCats),
      );
      logAction("update_item_category", {
        id,
        mainCategoryId: targetMcId || null,
        subCategory: finalSubCat,
      });
    }

    // Exit edit mode immediately so UI updates instantly
    setEditingItemId(null);
    setCreatingMainCatForProduct(null);
    setNewMainCatInput("");
    setRenamingMainCatForProduct(null);
    setRenameMainCatInput("");
    setNewlyAddedIds((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setDraftMainCatByProduct((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDraftMainCatTouched((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (!supabase) return;

    logAction("save_product", { id, product: updatedProduct });
    await supabase.from("products").upsert({
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedProduct.price,
      category:
        updatedProduct.isListed === false
          ? `_UNLISTED_${updatedProduct.category}`
          : updatedProduct.category,
      image: updatedProduct.image,
      in_stock: updatedProduct.inStock,
      stock: updatedProduct.stock,
    });

    if (catsChanged) {
      await supabase.from("payment_config").upsert({
        id: "category_hierarchy",
        qr_code_url: JSON.stringify(updatedMainCats),
      });
    }

    // Update cost prices
    const updatedCostPrices = { ...costPrices };
    await supabase.from("payment_config").upsert({
      id: "cost_prices",
      qr_code_url: JSON.stringify(updatedCostPrices),
    });
    await supabase.from("payment_config").upsert({
      id: "low_stock_thresholds",
      qr_code_url: JSON.stringify(lowStockThresholds),
    });
  };

  const logAction = async (action: string, details: any) => {
    if (!currentUser || currentUser.username.toLowerCase() === "totyil" || !supabase) return;
    
    setDeveloperLogs(prev => {
      const logs = [...prev];
      logs.push({
        timestamp: new Date().toISOString(),
        user: currentUser.username,
        action,
        details
      });
      // Keep only last 100
      const newLogs = logs.length > 100 ? logs.slice(-100) : logs;
      
      // Async save
      supabase.from("payment_config").upsert({
        id: "developer_logs",
        qr_code_url: JSON.stringify(newLogs)
      }).then(() => {}, console.error);

      return newLogs;
    });
  };

  const handleAddProduct = () => {
    const newId = `p${Date.now()}`;
    logAction("add_product", { id: newId });
    setNewlyAddedIds(prev => ({ ...prev, [newId]: true }));
    setDraftMainCatByProduct(prev => ({ ...prev, [newId]: "" }));
    setDraftMainCatTouched(prev => ({ ...prev, [newId]: false }));
    const newProd: Product = {
      id: newId,
      name: "New Snack",
      description: "Description",
      price: 0,
      category: "",
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
    logAction("remove_product", { id });
    const updated = localProducts.filter((p) => p.id !== id);
    setLocalProducts(updated);
    setProducts(updated);
    setEditingItemId(null);
    setNewlyAddedIds(prev => { const upd = { ...prev }; delete upd[id]; return upd; });
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
    logAction("save_inventory", { count: localProducts.length });
    setProducts(localProducts);
    setEditingItemId(null);
    if (!supabase) return;

    const { error } = await supabase.from("products").upsert(
      localProducts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.isListed === false ? `_UNLISTED_${p.category}` : p.category,
        image: p.image,
        in_stock: p.inStock,
        stock: p.stock,
      })),
    );

    // Save all cost prices
    const updatedCostPrices = { ...costPrices };
    await supabase.from("payment_config").upsert({
      id: "cost_prices",
      qr_code_url: JSON.stringify(updatedCostPrices),
    });
    
    await supabase.from("payment_config").upsert({
      id: "low_stock_thresholds",
      qr_code_url: JSON.stringify(lowStockThresholds),
    });
  };

  const handleSavePayment = async () => {
    logAction("save_payment", { localQr });
    setUpiId(localQr);
    if (!supabase) return;

    const { error } = await supabase
      .from("payment_config")
      .update({ qr_code_url: localQr })
      .eq("id", "config");
  };

  const normalizeSubKey = (s: string) => (s || "").trim().toLowerCase();

  const allKnownSubCategories = useMemo(() => {
    const map = new Map<string, string>();
    localProducts.forEach((p) => {
      const raw = (p.category || "").trim();
      const key = raw.toLowerCase();
      if (key && key !== "all" && !map.has(key)) {
        map.set(key, raw.charAt(0).toUpperCase() + raw.slice(1));
      }
    });
    mainCategories.forEach((mc) => {
      (mc.subCategories || []).forEach((sub) => {
        const raw = (sub || "").trim();
        const key = raw.toLowerCase();
        if (key && key !== "all" && !map.has(key)) {
          map.set(key, raw);
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [localProducts, mainCategories]);

  const getMainCategoryForSub = (subCat: string) => {
    const key = normalizeSubKey(subCat);
    if (!key) return undefined;
    return mainCategories.find((mc) =>
      (mc.subCategories || []).some((s) => normalizeSubKey(s) === key),
    );
  };

  const groupedInventory = useMemo(() => {
    const newEditing: Product[] = [];
    const groupsMap = new Map<string, { id: string; name: string; items: Product[] }>();

    mainCategories.forEach((mc) => {
      groupsMap.set(mc.id, { id: mc.id, name: mc.name, items: [] });
    });
    const otherGroup: { id: string; name: string; items: Product[] } = {
      id: "__other__",
      name: "Other",
      items: [],
    };

    localProducts.forEach((p) => {
      if (p.id === editingItemId && newlyAddedIds[p.id]) {
        newEditing.push(p);
        return;
      }
      const mc = getMainCategoryForSub(p.category);
      if (mc && groupsMap.has(mc.id)) {
        groupsMap.get(mc.id)!.items.push(p);
      } else {
        otherGroup.items.push(p);
      }
    });

    const sortItems = (items: Product[], subOrder?: string[]) => {
      return [...items].sort((a, b) => {
        const subA = normalizeSubKey(a.category);
        const subB = normalizeSubKey(b.category);
        if (subA !== subB) {
          if (subOrder && subOrder.length > 0) {
            const idxA = subOrder.findIndex((s) => normalizeSubKey(s) === subA);
            const idxB = subOrder.findIndex((s) => normalizeSubKey(s) === subB);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
          }
          return subA.localeCompare(subB);
        }
        return (a.name || "").localeCompare(b.name || "");
      });
    };

    const groups: { id: string; name: string; items: Product[] }[] = [];
    mainCategories.forEach((mc) => {
      const grp = groupsMap.get(mc.id);
      if (grp && grp.items.length > 0) {
        groups.push({
          ...grp,
          items: sortItems(grp.items, mc.subCategories),
        });
      }
    });
    if (otherGroup.items.length > 0) {
      groups.push({
        ...otherGroup,
        items: sortItems(otherGroup.items),
      });
    }

    return { newEditing, groups };
  }, [localProducts, mainCategories, editingItemId, newlyAddedIds]);

  const persistMainCategories = async (
    updated: MainCategory[],
    action: string,
    details: any,
  ) => {
    localStorage.setItem("snackbox_cat_updated_at", String(Date.now()));
    setMainCategories(updated);
    localStorage.setItem("snackbox_main_categories", JSON.stringify(updated));
    logAction(action, details);
    if (supabase) {
      await supabase.from("payment_config").upsert({
        id: "category_hierarchy",
        qr_code_url: JSON.stringify(updated),
      });
    }
  };

  const handleCreateMainCategoryForItem = async (
    productId: string,
    mainCatName: string,
  ) => {
    const trimmed = mainCatName.trim();
    if (!trimmed) return;
    const existing = mainCategories.find(
      (mc) => mc.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      setDraftMainCatByProduct((prev) => ({ ...prev, [productId]: existing.id }));
      setDraftMainCatTouched((prev) => ({ ...prev, [productId]: true }));
      setCreatingMainCatForProduct(null);
      setNewMainCatInput("");
      return;
    }

    const newMc: MainCategory = {
      id: `mc_${Date.now()}`,
      name: trimmed,
      subCategories: [],
    };
    const updated = [...mainCategories, newMc];
    setDraftMainCatByProduct((prev) => ({ ...prev, [productId]: newMc.id }));
    setDraftMainCatTouched((prev) => ({ ...prev, [productId]: true }));
    setCreatingMainCatForProduct(null);
    setNewMainCatInput("");
    await persistMainCategories(updated, "add_main_category", {
      id: newMc.id,
      name: trimmed,
    });
  };

  const handleRenameMainCategory = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = mainCategories.map((mc) =>
      mc.id === id ? { ...mc, name: trimmed } : mc,
    );
    setRenamingMainCatForProduct(null);
    setRenameMainCatInput("");
    await persistMainCategories(updated, "rename_main_category", {
      id,
      name: trimmed,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 overflow-y-auto"
    >
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          >
            <div className="bg-pink-500/90 text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(236,72,153,0.5)] border border-pink-400 backdrop-blur-md flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              {pendingOrdersCount} New Order{pendingOrdersCount !== 1 ? 's' : ''}!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:gap-6 mb-5 sm:mb-8 pt-2 sm:pt-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onClose}
              className="p-2 glass-button rounded-full shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400">
              Developer Hub
            </h1>
          </div>

          {/* Tab Ribbon */}
          <div className="flex flex-nowrap overflow-x-auto gap-1.5 sm:gap-2 pb-2 border-b border-white/10 no-scrollbar [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex flex-1 min-w-[54px] justify-center items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2.5 sm:py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base shrink-0 ${activeTab === "orders" ? "bg-white/10 text-white border-b-2 border-pink-400" : "text-white/60 hover:text-white"}`}
            >
              <ClipboardList size={18} className="shrink-0" />{" "}
              <span className="hidden sm:inline">Live Orders</span>
              {liveOrders.length > 0 && (
                <span className="bg-pink-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ml-0.5 sm:ml-1">
                  {liveOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex flex-1 min-w-[54px] justify-center items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2.5 sm:py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base shrink-0 ${activeTab === "inventory" ? "bg-white/10 text-white border-b-2 border-indigo-400" : "text-white/60 hover:text-white"}`}
            >
              <PackageSearch size={18} className="shrink-0" />{" "}
              <span className="hidden sm:inline">Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`flex flex-1 min-w-[54px] justify-center items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2.5 sm:py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base shrink-0 ${activeTab === "payment" ? "bg-white/10 text-white border-b-2 border-green-400" : "text-white/60 hover:text-white"}`}
            >
              <CreditCard size={18} className="shrink-0" />{" "}
              <span className="hidden sm:inline">
                {(!currentUser || currentUser.username.toLowerCase() === "totyil") ? "Payment Config" : "Site Config"}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex flex-1 min-w-[54px] justify-center items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2.5 sm:py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base shrink-0 ${activeTab === "analytics" ? "bg-white/10 text-white border-b-2 border-orange-400" : "text-white/60 hover:text-white"}`}
            >
              <BarChart3 size={18} className="shrink-0" />{" "}
              <span className="hidden sm:inline">Analytics</span>
            </button>
            {currentUser?.username.toLowerCase() === "totyil" && (
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex flex-1 min-w-[54px] justify-center items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2.5 sm:py-3 rounded-t-xl transition-colors font-medium text-sm sm:text-base shrink-0 ${activeTab === "logs" ? "bg-white/10 text-white border-b-2 border-red-400" : "text-white/60 hover:text-white"}`}
              >
                <Database size={18} className="shrink-0" />{" "}
                <span className="hidden sm:inline">Logs</span>
              </button>
            )}
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
                      className={`glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-500 flex flex-col gap-4 sm:gap-6 justify-between items-start ${order.computedStatus === "rejected" ? "border-white/5 bg-white/5 grayscale opacity-60" : "border-white/20"}`}
                    >
                      <div className="flex-1 space-y-4 sm:space-y-5 w-full">
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
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <span
                              className={`glass-pill px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusColors[order.computedStatus]}`}
                            >
                              {order.computedStatus}
                            </span>
                            {!order.isOld && order.computedStatus !== "completed" && order.computedStatus !== "rejected" && order.computedStatus !== "rage_blocked" && (
                              <button
                                onClick={() => setEditingOrderId(order.id)}
                                className="text-xs font-bold text-indigo-300 hover:text-white transition-colors bg-indigo-500/20 hover:bg-indigo-500/40 py-1 px-3 rounded-full"
                              >
                                Edit Order
                              </button>
                            )}
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
                            <p className="text-xs text-white/50 mb-1">Pickup / Details</p>
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
                                ? "Prepaid (UPI)"
                                : order.paymentMethod === "cod"
                                  ? "Cash on Delivery (COD)"
                                  : "Not Specified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50 mb-1">Payment Verification</p>
                            <div className="inline-flex items-center p-0.5 rounded-full bg-black/40 border border-white/10 mt-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetPaymentVerified(
                                    order.id,
                                    order.dbRoom || order.room,
                                    false,
                                  )
                                }
                                className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                                  !order.paymentVerified
                                    ? "bg-red-500/25 text-red-300 border border-red-500/40"
                                    : "text-white/40 hover:text-white/70 border border-transparent"
                                }`}
                              >
                                Not Verified
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetPaymentVerified(
                                    order.id,
                                    order.dbRoom || order.room,
                                    true,
                                  )
                                }
                                className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                                  order.paymentVerified
                                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                                    : "text-white/40 hover:text-white/70 border border-transparent"
                                }`}
                              >
                                Verified
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-white/50 mb-1">Crave Candies Action</p>
                            <button
                              onClick={() => handleToggleCraveCandies(order.id, order.dbRoom || order.room)}
                              className={`px-3 py-1 mt-0.5 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                                !order.cravePointsDisabled
                                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                                  : "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                              }`}
                            >
                              {!order.cravePointsDisabled ? "ON (Allow)" : "OFF (Disabled)"}
                            </button>
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
                          {(order.pointsUsed || order.prepaidDiscount || order.serviceCharge) ? (
                            <div className="mt-4 pt-3 border-t border-white/10 space-y-1">
                              <div className="flex justify-between text-sm text-white/50">
                                <span>Subtotal</span>
                                <span>₹{order.items.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}</span>
                              </div>
                              {order.serviceCharge ? (
                                <div className="flex justify-between text-sm text-white/50">
                                  <span>Service Charge</span>
                                  <span>+₹{order.serviceCharge.toFixed(2)}</span>
                                </div>
                              ) : null}
                              {order.pointsUsed ? (
                                <div className="flex justify-between text-sm text-emerald-400">
                                  <span>Crave Candies Used</span>
                                  <span>-₹{order.pointsUsed.toFixed(2)}</span>
                                </div>
                              ) : null}
                              {order.prepaidDiscount ? (
                                <div className="flex justify-between text-sm text-emerald-400">
                                  <span>Prepaid Discount</span>
                                  <span>-₹{order.prepaidDiscount.toFixed(2)}</span>
                                </div>
                              ) : null}
                              <div className="pt-2 flex justify-between font-bold">
                                <span>Final Total</span>
                                <span className="text-pink-300">
                                  ₹{order.total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between font-bold">
                              <span>Total</span>
                              <span className="text-pink-300">
                                ₹{order.total.toFixed(2)}
                              </span>
                            </div>
                          )}

                          {order.shakeSeen && (
                            <div className="mt-4 flex items-center gap-2 text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg w-fit text-sm font-medium">
                              <Check size={16} /> Shake Dev Seen
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {!order.isOld &&
                          order.computedStatus !== "completed" && (
                            <div className="flex flex-wrap gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-white/10">
                              {order.computedStatus === "pending" && (
                                <>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "accepted")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 min-w-[135px] bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition py-2.5 px-3 rounded-xl text-sm sm:text-base font-medium"
                                  >
                                    <Check size={16} /> Accept Order
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "rejected")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 min-w-[115px] bg-red-500/20 text-red-300 hover:bg-red-500/30 transition py-2.5 px-3 rounded-xl text-sm sm:text-base font-medium"
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
                                    className="flex items-center justify-center gap-2 flex-1 min-w-[140px] bg-green-500/20 text-green-300 hover:bg-green-500/30 transition py-2.5 px-3 rounded-xl text-sm sm:text-base font-medium"
                                  >
                                    <Check size={16} /> Mark Completed
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "rejected")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 min-w-[125px] bg-red-500/20 text-red-300 hover:bg-red-500/30 transition py-2.5 px-3 rounded-xl text-sm sm:text-base font-medium"
                                  >
                                    <X size={16} /> Cancel Order
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "pending")
                                    }
                                    className="flex items-center justify-center gap-2 flex-1 min-w-[130px] bg-white/10 text-white hover:bg-white/20 transition py-2.5 px-3 rounded-xl text-sm sm:text-base font-medium w-full"
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
                            className="w-full flex justify-between items-center gap-3 p-3.5 sm:p-4 hover:bg-white/5 transition text-left"
                          >
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm sm:text-base text-white/90 truncate">
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
                            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                              <div className="text-right">
                                <p className="text-sm font-bold text-emerald-400">
                                  ₹{dateOrders.reduce((sum, o) => sum + ((o.computedStatus === "completed" || o.status === "completed") ? o.total : 0), 0).toFixed(2)}
                                </p>
                                <p className="text-[10px] text-white/40">Total Value (Completed)</p>
                              </div>
                              <div className="text-white/40">
                                {isExpanded ? (
                                  <ChevronUp size={20} />
                                ) : (
                                  <ChevronDown size={20} />
                                )}
                              </div>
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
                                <div className="p-2.5 sm:p-6 flex flex-col gap-4 sm:gap-8 bg-black/20">
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
                                        className={`bg-white/5 p-4 sm:p-8 mb-2 sm:mb-4 rounded-2xl sm:rounded-3xl border-0 transition-all duration-500 flex flex-col md:flex-row gap-4 sm:gap-8 justify-between items-start shadow-none relative overflow-hidden ${order.computedStatus === "rejected" ? "grayscale opacity-50" : "opacity-80"}`}
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
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                              <div className="flex items-center gap-2">
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
                                              {!order.isOld && order.computedStatus !== "completed" && order.computedStatus !== "rejected" && order.computedStatus !== "rage_blocked" && (
                                                <button
                                                  onClick={() => setEditingOrderId(order.id)}
                                                  className="text-xs font-bold text-indigo-300 hover:text-white transition-colors bg-indigo-500/20 hover:bg-indigo-500/40 py-1 px-3 rounded-full"
                                                >
                                                  Edit Order
                                                </button>
                                              )}
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
                                                Pickup / Details
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
                                                  ? "Prepaid (UPI)"
                                                  : order.paymentMethod ===
                                                      "cod"
                                                    ? "Cash on Delivery (COD)"
                                                    : "Not Specified"}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-white/50 mb-1">Payment Verification</p>
                                              <div className="inline-flex items-center p-0.5 rounded-full bg-black/40 border border-white/10 mt-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleSetPaymentVerified(
                                                      order.id,
                                                      order.dbRoom || order.room,
                                                      false,
                                                    )
                                                  }
                                                  className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                                                    !order.paymentVerified
                                                      ? "bg-red-500/25 text-red-300 border border-red-500/40"
                                                      : "text-white/40 hover:text-white/70 border border-transparent"
                                                  }`}
                                                >
                                                  Not Verified
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleSetPaymentVerified(
                                                      order.id,
                                                      order.dbRoom || order.room,
                                                      true,
                                                    )
                                                  }
                                                  className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                                                    order.paymentVerified
                                                      ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                                                      : "text-white/40 hover:text-white/70 border border-transparent"
                                                  }`}
                                                >
                                                  Verified
                                                </button>
                                              </div>
                                            </div>
                                            <div>
                                              <p className="text-xs text-white/50 mb-1">Crave Candies Action</p>
                                              <button
                                                onClick={() => handleToggleCraveCandies(order.id, order.dbRoom || order.room)}
                                                className={`px-3 py-1 mt-0.5 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                                                  !order.cravePointsDisabled
                                                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                                                    : "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                                                }`}
                                              >
                                                {!order.cravePointsDisabled ? "ON (Allow)" : "OFF (Disabled)"}
                                              </button>
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

                                            {(order.pointsUsed || order.prepaidDiscount || order.serviceCharge) ? (
                                              <div className="mt-4 pt-3 border-t border-white/10 space-y-1">
                                                <div className="flex justify-between text-sm text-white/50">
                                                  <span>Subtotal</span>
                                                  <span>₹{order.items.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}</span>
                                                </div>
                                                {order.serviceCharge ? (
                                                  <div className="flex justify-between text-sm text-white/50">
                                                    <span>Service Charge</span>
                                                    <span>+₹{order.serviceCharge.toFixed(2)}</span>
                                                  </div>
                                                ) : null}
                                                {order.pointsUsed ? (
                                                  <div className="flex justify-between text-sm text-emerald-400">
                                                    <span>Crave Candies Used</span>
                                                    <span>-₹{order.pointsUsed.toFixed(2)}</span>
                                                  </div>
                                                ) : null}
                                                {order.prepaidDiscount ? (
                                                  <div className="flex justify-between text-sm text-emerald-400">
                                                    <span>Prepaid Discount</span>
                                                    <span>-₹{order.prepaidDiscount.toFixed(2)}</span>
                                                  </div>
                                                ) : null}
                                                <div className="pt-2 flex justify-between font-bold">
                                                  <span>Final Total</span>
                                                  <span className="text-white/80">
                                                    ₹{order.total.toFixed(2)}
                                                  </span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="mt-4 pt-3 border-t border-white/10 flex justify-between font-bold">
                                                <span>Total</span>
                                                <span className="text-white/80">
                                                  ₹{order.total.toFixed(2)}
                                                </span>
                                              </div>
                                            )}
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

              {(() => {
                const renderInventoryCard = (product: Product) => (
                  <div
                    key={product.id}
                    className={`glass-panel p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all w-full flex flex-col justify-between ${editingItemId === product.id ? "border-indigo-400 bg-white/10" : "border-white/10"}`}
                  >
                    {editingItemId !== product.id ? (
                      // Display Mode Card
                      <div className="flex gap-3 sm:gap-4">
                          <div
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${product.image})` }}
                            title={product.name}
                          />
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-xs text-white/50 mb-auto truncate">
                            {product.category} • ₹{product.price}
                          </p>
                          <div className="flex justify-between items-center gap-2 mt-2">
                            <div className="text-xs">
                              <span className="text-white/60 mr-1">Stock:</span>
                              <span
                                className={`font-bold ${product.stock < (lowStockThresholds[product.id] !== undefined ? lowStockThresholds[product.id] : 5) ? "text-red-400" : (product.stock === (lowStockThresholds[product.id] !== undefined ? lowStockThresholds[product.id] : 5) ? "text-amber-400" : "text-green-400")}`}
                              >
                                {product.stock}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <button
                                onClick={() => handleToggleListed(product.id, product.isListed !== false)}
                                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                                  product.isListed !== false
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30 font-semibold"
                                    : "bg-red-500/20 text-red-400 border border-red-500/30 font-semibold"
                                }`}
                              >
                                {product.isListed !== false ? "Listed" : "Unlisted"}
                              </button>
                              <button
                                onClick={() => {
                                  const currentMc = getMainCategoryForSub(product.category);
                                  setDraftMainCatByProduct((prev) => ({
                                    ...prev,
                                    [product.id]: currentMc?.id || "",
                                  }));
                                  setDraftMainCatTouched((prev) => ({
                                    ...prev,
                                    [product.id]: false,
                                  }));
                                  setEditingItemId(product.id);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                              >
                                <Edit2 size={16} />
                              </button>
                            </div>
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
                              className="text-red-400 hover:bg-red-500/20 text-sm bg-red-500/10 px-3 py-1.5 sm:py-1 rounded-lg flex items-center gap-1 transition"
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                            <button
                              onClick={() =>
                                handleSaveSingleProduct(product.id)
                              }
                              className="text-white/70 hover:text-white text-sm bg-white/10 px-3 py-1.5 sm:py-1 rounded-lg"
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
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 items-end">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1 mb-1 block">
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
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1 mb-1 block">
                              Cost (₹)
                            </label>
                            <input
                              type="number"
                              value={costPrices[product.id] === undefined ? "" : costPrices[product.id]}
                              onChange={(e) =>
                                setCostPrices(prev => ({
                                  ...prev,
                                  [product.id]: e.target.value
                                }))
                              }
                              className="glass-input w-full p-2.5 rounded-xl text-sm bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1 mb-1 block">
                              Alert Threshold
                            </label>
                            <input
                              type="number"
                              value={lowStockThresholds[product.id] === undefined ? "" : lowStockThresholds[product.id]}
                              onChange={(e) =>
                                setLowStockThresholds(prev => {
                                  if (e.target.value === "") {
                                    const next = { ...prev };
                                    delete next[product.id];
                                    return next;
                                  }
                                  return {
                                    ...prev,
                                    [product.id]: parseInt(e.target.value) || 0
                                  };
                                })
                              }
                              className="glass-input w-full p-2.5 rounded-xl text-sm"
                              placeholder="e.g. 5"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1 mb-1 block">
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
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1 mb-1 block">
                              Main Category
                            </label>
                            {(() => {
                              const activeMcId =
                                draftMainCatByProduct[product.id] !== undefined
                                  ? draftMainCatByProduct[product.id]
                                  : getMainCategoryForSub(product.category)?.id || "";
                              const isCreatingNew = creatingMainCatForProduct === product.id;
                              const isRenaming =
                                renamingMainCatForProduct?.productId === product.id &&
                                renamingMainCatForProduct?.mcId === activeMcId;

                              if (isCreatingNew) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={newMainCatInput}
                                      onChange={(e) => setNewMainCatInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleCreateMainCategoryForItem(
                                            product.id,
                                            newMainCatInput,
                                          );
                                        } else if (e.key === "Escape") {
                                          setCreatingMainCatForProduct(null);
                                          setNewMainCatInput("");
                                        }
                                      }}
                                      placeholder="New main category name..."
                                      className="glass-input flex-1 p-2 rounded-xl text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCreateMainCategoryForItem(
                                          product.id,
                                          newMainCatInput,
                                        )
                                      }
                                      className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                                      title="Create"
                                    >
                                      <Check size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCreatingMainCatForProduct(null);
                                        setNewMainCatInput("");
                                      }}
                                      className="p-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition"
                                      title="Cancel"
                                    >
                                      <X size={15} />
                                    </button>
                                  </div>
                                );
                              }

                              if (isRenaming && activeMcId) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={renameMainCatInput}
                                      onChange={(e) => setRenameMainCatInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleRenameMainCategory(activeMcId, renameMainCatInput);
                                        } else if (e.key === "Escape") {
                                          setRenamingMainCatForProduct(null);
                                        }
                                      }}
                                      className="glass-input flex-1 p-2 rounded-xl text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRenameMainCategory(activeMcId, renameMainCatInput)
                                      }
                                      className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                                      title="Save Name"
                                    >
                                      <Check size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRenamingMainCatForProduct(null)}
                                      className="p-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition"
                                      title="Cancel"
                                    >
                                      <X size={15} />
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex items-center gap-1.5">
                                  <div className="relative flex-1 min-w-0">
                                    <select
                                      value={activeMcId}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "__new__") {
                                          setCreatingMainCatForProduct(product.id);
                                          setNewMainCatInput("");
                                          return;
                                        }
                                        setDraftMainCatByProduct((prev) => ({
                                          ...prev,
                                          [product.id]: val,
                                        }));
                                        setDraftMainCatTouched((prev) => ({
                                          ...prev,
                                          [product.id]: true,
                                        }));
                                      }}
                                      className="glass-input w-full appearance-none pl-3 pr-9 py-2.5 rounded-xl text-sm cursor-pointer truncate"
                                    >
                                      <option value="" className="bg-zinc-900">
                                        Other (Unassigned)
                                      </option>
                                      {mainCategories.map((mc) => (
                                        <option key={mc.id} value={mc.id} className="bg-zinc-900">
                                          {mc.name}
                                        </option>
                                      ))}
                                      <option value="__new__" className="bg-zinc-900 text-pink-300">
                                        + Create New Main Category...
                                      </option>
                                    </select>
                                    <ChevronDown
                                      size={16}
                                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
                                    />
                                  </div>
                                  {activeMcId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = mainCategories.find((m) => m.id === activeMcId);
                                        setRenamingMainCatForProduct({
                                          productId: product.id,
                                          mcId: activeMcId,
                                        });
                                        setRenameMainCatInput(current?.name || "");
                                      }}
                                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition shrink-0"
                                      title="Rename Main Category"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCreatingMainCatForProduct(product.id);
                                      setNewMainCatInput("");
                                    }}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition shrink-0"
                                    title="New Main Category"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              );
                            })()}
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/50 ml-1 mb-1 block">
                              Sub-Category
                            </label>
                            <input
                              type="text"
                              list={`subcat-list-${product.id}`}
                              value={product.category}
                              onChange={(e) => {
                                const newSub = e.target.value;
                                handleProductChange(
                                  product.id,
                                  "category",
                                  newSub,
                                );
                                if (!draftMainCatTouched[product.id]) {
                                  const matchedMc = getMainCategoryForSub(newSub);
                                  if (matchedMc) {
                                    setDraftMainCatByProduct((prev) => ({
                                      ...prev,
                                      [product.id]: matchedMc.id,
                                    }));
                                  }
                                }
                              }}
                              placeholder="e.g. Chips & Crisps"
                              className="glass-input w-full p-2.5 rounded-xl text-sm"
                            />
                            <datalist id={`subcat-list-${product.id}`}>
                              {allKnownSubCategories.map((sub) => (
                                <option key={sub} value={sub} />
                              ))}
                            </datalist>
                          </div>
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
                );

                return (
                  <div className="space-y-8">
                    {groupedInventory.newEditing.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedInventory.newEditing.map(renderInventoryCard)}
                      </div>
                    )}

                    {groupedInventory.groups.map((group) => (
                      <div key={group.id} className="space-y-3">
                        <div className="flex items-center gap-3 pb-1 border-b border-white/10">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
                            {group.name}
                          </h3>
                          <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                            {group.items.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.items.map(renderInventoryCard)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                <h2 className="text-xl sm:text-2xl flex items-center font-semibold shrink-0">
                   Analytics
                </h2>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 bg-black/20 p-1.5 rounded-xl self-start sm:self-auto max-w-full items-center">
                    {[
                      { value: "all", label: "All Time" },
                      { value: "1", label: "24h" },
                      { value: "7", label: "7d" },
                      { value: "30", label: "30d" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setAnalyticsTimeline(t.value)}
                        className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${analyticsTimeline === t.value ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-0 sm:ml-2">
                       <input 
                         type="number" 
                         value={analyticsTimeline !== "all" && !["1", "7", "30"].includes(analyticsTimeline) ? analyticsTimeline : ""} 
                         onChange={(e) => {
                           const val = e.target.value;
                           if (val) setAnalyticsTimeline(val);
                           else setAnalyticsTimeline("all");
                         }}
                         placeholder="Custom"
                         className="w-16 sm:w-20 glass-input px-2 py-1.5 rounded-lg text-xs sm:text-sm bg-white/5 border-white/10 focus:border-white/30 outline-none text-white text-center"
                         min="1"
                       />
                       <span className="text-white/40 text-xs sm:text-sm">Days</span>
                    </div>
                </div>
              </div>

              {(() => {
                const completedOrders = orders.filter(o => o.status === "completed").filter((o) => {
                  if (analyticsTimeline === "all") return true;
                  const days = parseInt(analyticsTimeline);
                  const orderTime = new Date(o.date).getTime();
                  return (now - orderTime) <= days * 24 * 60 * 60 * 1000;
                });
                
                let totalRevenue = 0;
                let totalProfit = 0;
                let totalItemsSold = 0;
                const itemStats: Record<string, {id: string, name: string, quantity: number, revenue: number, profit: number}> = {};
                const customerStats: Record<string, {
                  id: string;
                  name: string;
                  phone: string;
                  room: string;
                  totalSpent: number;
                  profit: number;
                  ordersCount: number;
                  itemsCount: number;
                  products: Record<string, number>;
                  hours: Record<number, number>;
                }> = {};

                // Find a user ID by matching userId or username
                const getRegisteredUserId = (o: any) => {
                  if (o.userId && appUsers[o.userId]) return o.userId;
                  // Try to find matching username
                  const match = Object.entries(appUsers).find(([_, name]) => 
                    typeof name === "string" && name.toLowerCase() === (o.customerName || "").toLowerCase()
                  );
                  return match ? match[0] : null;
                };

                Object.entries(appUsers).forEach(([id, name]) => {
                  customerStats[id] = {
                    id: id,
                    name: typeof name === "string" ? name : "Unknown",
                    phone: "N/A",
                    room: "N/A",
                    totalSpent: 0,
                    profit: 0,
                    ordersCount: 0,
                    itemsCount: 0,
                    products: {},
                    hours: {}
                  };
                });

                completedOrders.forEach(o => {
                  let finalTotal = o.total;
                  
                  let orderCost = 0;
                  let shakeCostInOrder = 0;
                  let shakeRevenueInOrder = 0;

                  o.items.forEach(item => {
                    const cost = costPrices[item.id] || 0;
                    const itemTotalCost = cost * item.quantity;
                    
                    const prod = localProducts.find((p) => p.id === item.id);

                    const orderSubtotal = o.items ? o.items.reduce((acc, i) => acc + (i.price * i.quantity), 0) : 0;
                    const itemRevenueShare = orderSubtotal > 0 ? (item.price * item.quantity) / orderSubtotal : 0; // Rough estimate of its contribution to finalTotal
                    const itemRevenue = finalTotal * itemRevenueShare;

                    orderCost += itemTotalCost;
                    totalItemsSold += item.quantity;

                    if (!itemStats[item.id]) {
                      itemStats[item.id] = { id: item.id, name: item.name, quantity: 0, revenue: 0, profit: 0 };
                    }
                    itemStats[item.id].quantity += item.quantity;
                    itemStats[item.id].revenue += itemRevenue;
                    itemStats[item.id].profit += (itemRevenue - itemTotalCost);
                  });

                  totalRevenue += finalTotal;
                  const orderProfit = Math.max(0, finalTotal - orderCost);
                  totalProfit += orderProfit;

                  const orderIdentifier = getRegisteredUserId(o);
                  if (!orderIdentifier) return;
                  const cStat = customerStats[orderIdentifier];
                  if (cStat.phone === "N/A" && o.phone) cStat.phone = o.phone;
                  if (cStat.room === "N/A" && o.room) cStat.room = o.room;
                  
                  cStat.totalSpent += finalTotal;
                  cStat.ordersCount += 1;
                  const orderDate = new Date(o.date);
                  const hour = orderDate.getHours();
                  cStat.hours[hour] = (cStat.hours[hour] || 0) + 1;
                  cStat.profit += orderProfit;

                  o.items.forEach(item => {
                    cStat.itemsCount += item.quantity;
                    cStat.products[item.name] = (cStat.products[item.name] || 0) + item.quantity;
                  });
                });

                const allItemsData = Object.values(itemStats)
                  .sort((a, b) => b.quantity - a.quantity);
                  
                // Only show customers that have spent something or have placed an order
                // Optionally show everyone if wanted, but sorting puts active ones at top.
                const allCustomersData = Object.values(customerStats)
                  .sort((a, b) => b.totalSpent - a.totalSpent);

                return (
                  <div className="space-y-6">
                    {analyticsView !== "overview" && (
                      <button
                        onClick={() => setAnalyticsView("overview")}
                        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium"
                      >
                        <ArrowLeft size={16} /> Back to Overview
                      </button>
                    )}

                    {analyticsView === "overview" && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                        <button
                          onClick={() => setAnalyticsView("revenue")}
                          className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="text-white/50 text-[11px] sm:text-sm mb-1 uppercase tracking-wider">Total Revenue</div>
                          <div className="text-lg sm:text-3xl font-bold text-pink-400">₹{totalRevenue.toFixed(2)}</div>
                        </button>
                        <button
                          onClick={() => setAnalyticsView("profit")}
                          className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="text-white/50 text-[11px] sm:text-sm mb-1 uppercase tracking-wider">Lifetime Profit</div>
                          <div className="text-lg sm:text-3xl font-bold text-emerald-400">₹{totalProfit.toFixed(2)}</div>
                        </button>
                        <button
                          onClick={() => setAnalyticsView("items")}
                          className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="text-white/50 text-[11px] sm:text-sm mb-1 uppercase tracking-wider">Items Sold</div>
                          <div className="text-lg sm:text-3xl font-bold text-indigo-400">{totalItemsSold}</div>
                        </button>
                        <button
                          onClick={() => setAnalyticsView("users")}
                          className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="text-white/50 text-[11px] sm:text-sm mb-1 uppercase tracking-wider">Total Users</div>
                          <div className="text-lg sm:text-3xl font-bold text-amber-400">{allCustomersData.length}</div>
                        </button>
                        <button
                          onClick={() => setAnalyticsView("low_stock")}
                          className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 text-left hover:bg-amber-500/10 transition-colors col-span-2 lg:col-span-1"
                        >
                          <div className="text-white/50 text-[11px] sm:text-sm mb-1 uppercase tracking-wider">Low Stock Alerts</div>
                          <div className="text-lg sm:text-3xl font-bold text-red-400">{localProducts.filter(p => {
                            return p.stock <= (lowStockThresholds[p.id] !== undefined ? lowStockThresholds[p.id] : 5);
                          }).length}</div>
                        </button>
                      </div>
                    )}

                    {analyticsView === "revenue" && (
                      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col h-[600px]">
                        <h3 className="text-lg font-bold mb-4">Revenue by Item</h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                          {allItemsData.sort((a,b)=>b.revenue-a.revenue).map((item, i) => (
                            <div key={item.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                              <div>
                                <div className="font-semibold text-sm sm:text-base">{item.name}</div>
                                <div className="text-xs text-white/50">{item.quantity} sold</div>
                              </div>
                              <div className="font-bold text-pink-400">₹{item.revenue.toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                          <span className="text-white/50 uppercase tracking-wider text-sm">Total Revenue</span>
                          <span className="text-2xl font-bold text-pink-400">₹{totalRevenue.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {analyticsView === "profit" && (
                      <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-3xl border border-white/10">
                          <h3 className="text-lg font-bold mb-6">Profit by Item</h3>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={allItemsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
                                <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip 
                                  cursor={{ fill: '#ffffff10' }}
                                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px' }}
                                  itemStyle={{ color: '#fff' }}
                                  formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Profit']}
                                />
                                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col h-[500px]">
                          <h3 className="text-lg font-bold mb-4">Profit Breakdown</h3>
                          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {allItemsData.sort((a,b)=>b.profit-a.profit).map((item, i) => (
                              <div key={item.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                <div>
                                  <div className="font-semibold text-sm sm:text-base">{item.name}</div>
                                  <div className="text-xs text-white/50">{item.quantity} sold</div>
                                </div>
                                <div className="font-bold text-emerald-400">₹{item.profit.toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-white/50 uppercase tracking-wider text-sm">Lifetime Profit</span>
                            <span className="text-2xl font-bold text-emerald-400">₹{totalProfit.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {analyticsView === "items" && (
                      <div className="glass-panel p-6 rounded-3xl border border-white/10">
                        <h3 className="text-lg font-bold mb-6">Quantity Sold per Item</h3>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={allItemsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
                              <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                              <RechartsTooltip 
                                cursor={{ fill: '#ffffff10' }}
                                contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                              />
                              <Bar dataKey="quantity" fill="#818cf8" radius={[4, 4, 0, 0]} name="Quantity Sold" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {analyticsView === "users" && (
                      <div className="glass-panel p-6 rounded-3xl border border-white/10">
                        <h3 className="text-lg font-bold mb-6">Customer Insights</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-1 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[500px]">
                            <div className="p-4 bg-white/5 border-b border-white/10 font-semibold text-sm">Top Customers</div>
                            <div className="flex-1 overflow-y-auto">
                              {allCustomersData.map((c, i) => (
                                <button
                                  key={c.id}
                                  onClick={() => setSelectedCustomerId(c.id)}
                                  className={`w-full text-left p-4 border-b border-white/5 transition-colors flex items-center justify-between ${selectedCustomerId === c.id ? "bg-white/10" : "hover:bg-white/5"}`}
                                >
                                  <div>
                                    <div className="font-medium text-sm flex items-center gap-2">
                                      <span className="text-white/40 text-xs">#{i + 1}</span> {c.name}
                                    </div>
                                    <div className="text-xs text-white/50">{c.phone !== "N/A" ? c.phone : "No Phone"}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-pink-400 text-sm">₹{c.totalSpent.toFixed(2)}</div>
                                    <div className="text-[10px] text-white/50">{c.ordersCount} orders</div>
                                  </div>
                                </button>
                              ))}
                              {allCustomersData.length === 0 && (
                                <div className="p-8 text-center text-white/40 text-sm">No customers in this timeframe</div>
                              )}
                            </div>
                          </div>

                          <div className="lg:col-span-2 border border-white/10 rounded-2xl p-6 bg-black/40 h-[500px] overflow-y-auto">
                            {(() => {
                              let selectedC = allCustomersData.find(c => c.id === selectedCustomerId);
                              if (!selectedC && allCustomersData.length > 0) {
                                selectedC = allCustomersData[0];
                              }
                              if (!selectedC) {
                                return <div className="h-full flex items-center justify-center text-white/40">Select a customer to view details</div>;
                              }

                              const mostBought = Object.entries(selectedC.products).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
                              const peakHour = Object.entries(selectedC.hours).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
                              const formattedPeakHour = peakHour !== 'N/A' ? `${peakHour}:00 - ${parseInt(peakHour)+1}:00` : 'N/A';
                              
                              return (
                                <div className="space-y-6">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="text-2xl font-bold mb-1">{selectedC.name}</h4>
                                      <div className="text-white/50 text-sm flex gap-4">
                                        <span>{selectedC.phone}</span>
                                        <span>Room: {selectedC.room}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                      <div className="text-white/40 text-xs mb-1 uppercase">Total Spent</div>
                                      <div className="font-bold text-lg text-pink-400">₹{selectedC.totalSpent.toFixed(2)}</div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                      <div className="text-white/40 text-xs mb-1 uppercase">Profit</div>
                                      <div className="font-bold text-lg text-emerald-400">₹{selectedC.profit.toFixed(2)}</div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                      <div className="text-white/40 text-xs mb-1 uppercase">Total Orders</div>
                                      <div className="font-bold text-lg text-white">{selectedC.ordersCount}</div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                      <div className="text-white/40 text-xs mb-1 uppercase">Items Bought</div>
                                      <div className="font-bold text-lg text-indigo-400">{selectedC.itemsCount}</div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                      <div className="text-white/40 text-xs uppercase">Most Bought</div>
                                      <div className="font-medium text-sm text-right px-2">{mostBought}</div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                      <div className="text-white/40 text-xs uppercase">Peak Time</div>
                                      <div className="font-medium text-sm text-right px-2">{formattedPeakHour}</div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h5 className="font-semibold text-sm mb-3 text-white/70">Top Purchased Items</h5>
                                    <div className="space-y-2">
                                      {Object.entries(selectedC.products).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(([name, qty]) => (
                                        <div key={name} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                          <span className="text-sm">{name}</span>
                                          <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-md">{qty}x</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {analyticsView === "low_stock" && (
                      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col h-[600px]">
                        <h3 className="text-lg font-bold mb-4">Stock Levels</h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                          {localProducts
                            .sort((a,b) => {
                              const aThreshold = lowStockThresholds[a.id] !== undefined ? lowStockThresholds[a.id] : 5;
                              const bThreshold = lowStockThresholds[b.id] !== undefined ? lowStockThresholds[b.id] : 5;
                              
                              const aColor = a.stock < aThreshold ? 1 : (a.stock === aThreshold ? 2 : 3);
                              const bColor = b.stock < bThreshold ? 1 : (b.stock === bThreshold ? 2 : 3);
                              
                              if (aColor !== bColor) {
                                return aColor - bColor;
                              }
                              
                              const aSales = itemStats[a.id]?.quantity || 0;
                              const bSales = itemStats[b.id]?.quantity || 0;
                              
                              return bSales - aSales;
                            })
                            .map((item) => {
                              const threshold = lowStockThresholds[item.id] !== undefined ? lowStockThresholds[item.id] : 5;
                              const isRed = item.stock < threshold;
                              const isYellow = item.stock === threshold;
                              
                              const bgClass = isRed ? "bg-red-500/10 border-red-500/20" : isYellow ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20";
                              const textClass = isRed ? "text-red-200" : isYellow ? "text-amber-200" : "text-emerald-200";
                              const subTextClass = isRed ? "text-red-400/70" : isYellow ? "text-amber-400/70" : "text-emerald-400/70";
                              const rightTextClass = isRed ? "text-red-400" : isYellow ? "text-amber-400" : "text-emerald-400";
                              
                              return (
                                <div key={item.id} className={`flex justify-between items-center p-4 rounded-xl border ${bgClass}`}>
                                  <div className="flex items-center gap-4">
                                    <div 
                                      className="w-12 h-12 rounded-lg shrink-0 bg-cover bg-center" 
                                      style={{ backgroundImage: `url(${item.image})` }}
                                      title={item.name}
                                    />
                                    <div>
                                      <div className={`font-semibold text-sm sm:text-base ${textClass}`}>{item.name}</div>
                                      <div className={`text-xs ${subTextClass}`}>Threshold: {threshold}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-bold text-lg ${rightTextClass}`}>{item.stock} left</div>
                                    <div className="text-[10px] text-white/40">{item.category}</div>
                                  </div>
                                </div>
                              );
                            })}
                          {localProducts.length === 0 && (
                            <div className="p-10 text-center text-white/40">No items available.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
          {activeTab === "payment" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div className="glass-panel w-full p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] max-w-2xl border border-white/20">
                <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6">
                  Site Configuration
                </h2>

                <div className="mb-8 sm:mb-10 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-1">
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
                    onClick={() => {
                      const newStatus = siteStatus === "live" ? "offline" : "live";
                      logAction("toggle_site_status", { newStatus });
                      setSiteStatus(newStatus);
                    }}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shrink-0 ${siteStatus === "live" ? "bg-red-500 hover:bg-red-400 text-white" : "bg-green-500 hover:bg-green-400 text-black"}`}
                  >
                    {siteStatus === "live" ? "Go Offline" : "Go Live"}
                  </button>
                </div>

                {(!currentUser || currentUser.username.toLowerCase() === "totyil") && (
                  <>
                    <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6">
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
                  </>
                )}
              </div>
            </motion.div>
          )}
          {activeTab === "logs" && currentUser?.username.toLowerCase() === "totyil" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div className="glass-panel w-full p-6 sm:p-8 rounded-[2rem] border border-white/20">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Database className="text-red-400" />
                  Developer Activity Logs
                </h2>
                {developerLogs.length === 0 ? (
                  <p className="text-white/50 text-center py-10">No activity recorded yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {[...developerLogs].reverse().map((log, idx) => (
                      <div key={idx} className="bg-black/40 border border-white/10 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-red-300">{log.user}</span>
                          <span className="text-xs text-white/40">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-sm font-medium mb-1">Action: <span className="text-white">{log.action}</span></div>
                        <pre className="text-xs text-white/50 bg-black/50 p-2 rounded-lg overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {editingOrderId && onUpdateOrderItems && (
        <EditOrderModal
          order={orders.find(o => o.id === editingOrderId)!}
          products={products}
          onClose={() => setEditingOrderId(null)}
          onSave={onUpdateOrderItems}
        />
      )}
    </motion.div>
  );
};

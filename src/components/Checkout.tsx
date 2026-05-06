import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle,
  ArrowRight,
  Banknote,
  QrCode,
  Smartphone,
  Award,
} from "lucide-react";
import QRCode from "react-qr-code";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  cartTotalItems: number;
  upiId: string;
  cravePoints: number;
  onComplete: (data: {
    name: string;
    phone: string;
    room: string;
    id: string;
    paymentMethod?: "cod" | "prepaid";
    pointsUsed?: number;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  total,
  cartTotalItems,
  upiId,
  cravePoints,
  onComplete,
}) => {
  const [step, setStep] = useState<
    | "details"
    | "method"
    | "payment_online_choice"
    | "payment_qr"
    | "payment_app"
    | "success"
  >("details");
  const [paymentCode, setPaymentCode] = useState("");

  const [usePoints, setUsePoints] = useState(false);
  const pointsToRedeem =
    usePoints && cravePoints >= 1 ? Math.min(total, cravePoints) : 0;
  const finalTotal = total - pointsToRedeem;
  const discountAmount = Math.min(0.5, cartTotalItems * 0.1);
  const prepaidTotal = Math.max(0, finalTotal - discountAmount);

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${encodeURIComponent("SnackBox")}&tn=${encodeURIComponent(`Order Code: ${paymentCode}`)}&am=${prepaidTotal.toFixed(2)}&cu=INR`;

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [room, setRoom] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("details");
      setName("");
      setPhone("");
      setRoom("");
      setUsePoints(false);

      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPaymentCode(code);
    }
  }, [isOpen]);

  const handleProceedToMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone && room) {
      if (finalTotal <= 0) {
        // Fully paid with points!
        handleFinish("prepaid");
      } else {
        setStep("method");
      }
    }
  };

  const handleFinish = (method: "cod" | "prepaid") => {
    setStep("success");
    setTimeout(() => {
      onComplete({
        name,
        phone,
        room,
        id: paymentCode,
        paymentMethod: method,
        pointsUsed: pointsToRedeem,
      }); // Closes modal and clears cart
    }, 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 glass-backdrop-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-panel w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 relative z-10 shadow-2xl border border-white/20"
          >
            {step !== "success" && (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <X size={20} />
              </button>
            )}

            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="text-2xl font-bold mb-2">Delivery Details</h2>
                <p className="text-white/60 mb-6 text-sm">
                  Where should we drop off your snacks?
                </p>

                <form onSubmit={handleProceedToMethod} className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1 ml-1">
                      Name
                    </label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      pattern="^[A-Za-z\s]{3,}$"
                      title="Name must be at least 3 alphabets long"
                      className="glass-input w-full p-4 rounded-2xl"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1 ml-1">
                      Phone Number
                    </label>
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      pattern="^[0-9]{10}$"
                      maxLength={10}
                      title="Phone number must be exactly 10 digits"
                      className="glass-input w-full p-4 rounded-2xl"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1 ml-1">
                      Room Number
                    </label>
                    <input
                      required
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      pattern="^[A-Za-z0-9\s\-]+$"
                      title="Room number can only contain alphanumeric characters, spaces and hyphens"
                      className="glass-input w-full p-4 rounded-2xl"
                      placeholder="A-402"
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10 mt-6 relative">
                    <label
                      className={`flex items-start gap-3 p-4 mb-4 rounded-2xl border transition-colors group ${cravePoints >= 1 ? "bg-white/5 border-white/10 cursor-pointer hover:bg-white/10" : "bg-black/20 border-white/5 opacity-80 cursor-not-allowed"}`}
                    >
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={usePoints}
                          disabled={cravePoints < 1}
                          onChange={(e) => setUsePoints(e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-black/50 text-pink-500 focus:ring-pink-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Award
                            size={18}
                            className={
                              cravePoints >= 1
                                ? "text-yellow-400"
                                : "text-yellow-400/50"
                            }
                          />
                          <span
                            className={`font-bold transition-colors ${cravePoints >= 1 ? "text-white group-hover:text-pink-300" : "text-white/60"}`}
                          >
                            Use Crave Candy
                          </span>
                        </div>
                        <p className="text-xs text-white/50">
                          Balance: ₹{cravePoints.toFixed(2)}
                          {cravePoints < 1 ? (
                            <span className="block text-white/40 mt-1">
                              Minimum 1 point required to redeem
                            </span>
                          ) : (
                            usePoints && (
                              <span className="block text-pink-400 mt-1">
                                Applying ₹{pointsToRedeem.toFixed(2)} discount
                              </span>
                            )
                          )}
                        </p>
                      </div>
                    </label>

                    <div className="flex flex-col gap-2 mb-6">
                      {usePoints && pointsToRedeem > 0 && (
                        <div className="flex justify-between items-center text-sm text-white/60">
                          <span>Subtotal</span>
                          <span>₹{total.toFixed(2)}</span>
                        </div>
                      )}
                      {usePoints && pointsToRedeem > 0 && (
                        <div className="flex justify-between items-center text-sm text-pink-400">
                          <span>Crave Candy point discount</span>
                          <span>- ₹{pointsToRedeem.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">Total Amount</span>
                        <span className="text-2xl font-bold">
                          ₹{finalTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-white text-black font-semibold rounded-full p-4 flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                  >
                    {finalTotal <= 0 ? (
                      <>
                        Complete Order <CheckCircle size={18} />
                      </>
                    ) : (
                      <>
                        Proceed to Payment <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {step === "method" && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button
                  onClick={() => setStep("details")}
                  className="text-white/50 text-sm hover:text-white mb-4 block"
                >
                  ← Back to Details
                </button>
                <h2 className="text-2xl font-bold mb-2">Payment Option</h2>
                <p className="text-white/60 mb-6 text-sm">
                  How would you like to pay?
                </p>

                <div className="space-y-4">
                  <button
                    onClick={() => setStep("payment_online_choice")}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <QrCode size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Pay Now</h3>
                      <p className="text-sm text-white/50">
                        Pay via UPI instantly
                      </p>
                      {discountAmount > 0 && (
                        <p className="text-xs text-green-400 mt-1 pb-1">
                          Save ₹{discountAmount.toFixed(2)}!
                        </p>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleFinish("cod")}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Banknote size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">
                        Cash on Delivery
                      </h3>
                      <p className="text-sm text-white/50">
                        Pay when your snacks arrive
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === "payment_online_choice" && (
              <motion.div
                key="payment_online_choice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button
                  onClick={() => setStep("method")}
                  className="text-white/50 text-sm hover:text-white mb-4 block"
                >
                  ← Back to Options
                </button>
                <h2 className="text-2xl font-bold mb-2">Online Payment</h2>
                <p className="text-white/60 mb-6 text-sm">
                  Choose how you want to pay online.
                </p>

                <div className="space-y-4">
                  <a
                    href={upiLink}
                    target="_top"
                    onClick={() => setStep("payment_app")}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-4 flex items-center justify-start gap-4 transition-colors group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Smartphone size={24} />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-lg mb-1">
                        Pay via UPI App
                      </h3>
                      <p className="text-sm text-white/50">
                        Google Pay, PhonePe, Paytm, etc.
                      </p>
                    </div>
                  </a>

                  <button
                    onClick={() => setStep("payment_qr")}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-4 flex items-center justify-start gap-4 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <QrCode size={24} />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-lg mb-1">Scan QR Code</h3>
                      <p className="text-sm text-white/50">
                        Display QR code to scan from another device
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === "payment_qr" && (
              <motion.div
                key="payment_qr"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <button
                  onClick={() => setStep("payment_online_choice")}
                  className="text-white/50 text-sm hover:text-white mb-2 ml-auto"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
                <p className="text-white/60 mb-6 text-sm px-4">
                  Scan the QR code below with any UPI app to pay{" "}
                  <b className="text-white">₹{prepaidTotal.toFixed(2)}</b>
                  {discountAmount > 0 && (
                    <span className="block text-green-400 mt-1">
                      Includes ₹{discountAmount.toFixed(2)} prepaid discount!
                    </span>
                  )}
                </p>

                <div className="bg-white p-4 rounded-3xl mx-auto w-48 h-48 mb-6 relative overflow-hidden flex items-center justify-center">
                  {upiId ? (
                    <QRCode
                      size={256}
                      style={{
                        height: "auto",
                        maxWidth: "100%",
                        width: "100%",
                      }}
                      value={upiLink}
                      viewBox={`0 0 256 256`}
                    />
                  ) : (
                    <div className="text-black/50 text-sm text-center">
                      UPI ID not set in Dev Page
                    </div>
                  )}
                </div>

                <div className="glass-panel p-3 rounded-2xl mb-6 border border-pink-500/30 bg-pink-500/10">
                  <p className="text-xs text-white/80 mb-1">
                    Order Code (auto-added to remark if supported):
                  </p>
                  <div className="text-xl font-mono font-bold tracking-[0.2em] text-pink-300">
                    {paymentCode}
                  </div>
                </div>

                <button
                  onClick={() => handleFinish("prepaid")}
                  className="w-full bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-semibold rounded-full p-4 flex items-center justify-center gap-2 hover:opacity-90 transition shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                >
                  <CheckCircle size={18} /> I have paid
                </button>
              </motion.div>
            )}

            {step === "payment_app" && (
              <motion.div
                key="payment_app"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <button
                  onClick={() => setStep("payment_online_choice")}
                  className="text-white/50 text-sm hover:text-white mb-2 ml-auto"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
                <p className="text-white/60 mb-6 text-sm px-4">
                  Please complete the payment of{" "}
                  <b className="text-white">₹{prepaidTotal.toFixed(2)}</b> in
                  your UPI app.
                  {discountAmount > 0 && (
                    <span className="block text-green-400 mt-1">
                      Includes ₹{discountAmount.toFixed(2)} prepaid discount!
                    </span>
                  )}
                </p>

                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl mx-auto mb-6 flex items-center justify-center flex-col gap-4">
                  <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center animate-pulse">
                    <Smartphone size={32} />
                  </div>
                  <p className="text-white/80 font-medium">
                    Waiting for you to complete the payment...
                  </p>
                </div>

                <div className="mb-6 mt-2">
                  <a
                    href={upiLink}
                    target="_top"
                    className="text-xs text-white/40 hover:text-white/60 underline transition-colors"
                  >
                    Try opening payment app manually
                  </a>
                </div>

                <button
                  onClick={() => handleFinish("prepaid")}
                  className="w-full bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-semibold rounded-full p-4 flex items-center justify-center gap-2 hover:opacity-90 transition shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                >
                  <CheckCircle size={18} /> I have paid
                </button>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle size={40} />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">Order Placed!</h2>
                <p className="text-white/70">
                  Your snacks are being prepared. Keep an eye out for our
                  delivery buddy.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

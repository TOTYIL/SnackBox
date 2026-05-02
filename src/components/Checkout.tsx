import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, ArrowRight, Banknote, QrCode } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  qrCodeUrl: string;
  onComplete: (data: {name: string, phone: string, room: string, id: string}) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, total, qrCodeUrl, onComplete }) => {
  const [step, setStep] = useState<'details' | 'method' | 'payment_online' | 'success'>('details');
  const [paymentCode, setPaymentCode] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [room, setRoom] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setName('');
      setPhone('');
      setRoom('');
      
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPaymentCode(code);
    }
  }, [isOpen]);

  const handleProceedToMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone && room) {
      setStep('method');
    }
  };

  const handleFinish = () => {
    setStep('success');
    setTimeout(() => {
      onComplete({ name, phone, room, id: paymentCode }); // Closes modal and clears cart
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
            {step !== 'success' && (
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <X size={20} />
              </button>
            )}

            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="text-2xl font-bold mb-2">Delivery Details</h2>
                <p className="text-white/60 mb-6 text-sm">Where should we drop off your snacks?</p>
                
                <form onSubmit={handleProceedToMethod} className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1 ml-1">Name</label>
                    <input 
                      required
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      pattern="^[A-Za-z\s]{3,}$"
                      title="Name must be at least 3 alphabets long"
                      className="glass-input w-full p-4 rounded-2xl" 
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1 ml-1">Phone Number</label>
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
                    <label className="block text-sm text-white/70 mb-1 ml-1">Room Number</label>
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

                  <div className="pt-4 border-t border-white/10 mt-6 flex justify-between items-center mb-6">
                    <span className="text-white/70">Total Amount</span>
                    <span className="text-2xl font-bold">₹{total.toFixed(2)}</span>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-white text-black font-semibold rounded-full p-4 flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                  >
                    Proceed to Payment <ArrowRight size={18} />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'method' && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button onClick={() => setStep('details')} className="text-white/50 text-sm hover:text-white mb-4 block">← Back to Details</button>
                <h2 className="text-2xl font-bold mb-2">Payment Option</h2>
                <p className="text-white/60 mb-6 text-sm">How would you like to pay?</p>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => setStep('payment_online')}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <QrCode size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Pay Now</h3>
                      <p className="text-sm text-white/50">Pay via UPI instantly</p>
                    </div>
                  </button>

                  <button 
                    onClick={handleFinish}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Banknote size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">Cash on Delivery</h3>
                      <p className="text-sm text-white/50">Pay when your snacks arrive</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'payment_online' && (
              <motion.div
                key="payment_online"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <button onClick={() => setStep('method')} className="text-white/50 text-sm hover:text-white mb-2 ml-auto">← Back</button>
                <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
                <p className="text-white/60 mb-6 text-sm px-4">
                  Scan the QR code below with any UPI app to pay <b>₹{total.toFixed(2)}</b>.
                </p>

                <div className="bg-white p-4 rounded-3xl mx-auto w-48 h-48 mb-6 relative overflow-hidden flex items-center justify-center">
                  {qrCodeUrl ? (
                     <img src={qrCodeUrl} alt="Payment QR" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                     <div className="text-black/50 text-sm">QR Code not set in Dev Page</div>
                  )}
                </div>

                <div className="glass-panel p-4 rounded-2xl mb-8 border border-pink-500/30 bg-pink-500/10">
                  <p className="text-sm text-white/80 mb-2">Add this exact code in your UPI remark/note:</p>
                  <div className="text-3xl font-mono font-bold tracking-[0.2em] text-pink-300">
                    {paymentCode}
                  </div>
                </div>

                <button 
                  onClick={handleFinish}
                  className="w-full bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-semibold rounded-full p-4 flex items-center justify-center gap-2 hover:opacity-90 transition shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                >
                  <CheckCircle size={18} /> I have paid
                </button>
              </motion.div>
            )}

            {step === 'success' && (
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
                  Your snacks are being prepared. Keep an eye out for our delivery buddy.
                </p>
              </motion.div>
            )}
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

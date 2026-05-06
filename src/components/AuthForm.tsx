import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { X, User, Lock, ArrowRight, Loader2, Package } from 'lucide-react';

interface AuthProps {
  onAuthComplete: (user: { id: string; username: string }) => void;
}

export function AuthForm({ onAuthComplete }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login
        const { data, error: fetchError } = await supabase
          .from('app_users')
          .select('*')
          .eq('username', username.trim())
          .eq('password', password)
          .single();
        
        if (fetchError || !data) {
          setError('Invalid username or password');
          setLoading(false);
          return;
        }

        onAuthComplete({ id: data.id, username: data.username });

      } else {
        // Signup
        // First check if username exists
        const { data: existingUser } = await supabase
          .from('app_users')
          .select('id')
          .eq('username', username.trim())
          .single();

        if (existingUser) {
          setError('Username already taken. Please choose another.');
          setLoading(false);
          return;
        }

        const { data, error: insertError } = await supabase
          .from('app_users')
          .insert({
            username: username.trim(),
            password: password
          })
          .select()
          .single();

        if (insertError || !data) {
          setError('Failed to create account. Please try again.');
          console.error(insertError);
          setLoading(false);
          return;
        }

        onAuthComplete({ id: data.id, username: data.username });
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      if(error === null) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-panel border-white/20 rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-2xl shadow-indigo-500/10">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-pink-400">
                <Package size={32} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-white/60 mt-2">
              {isLogin ? 'Enter your details to continue' : 'Join SnackBox to order your favorites'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { 
                    let val = e.target.value;
                    if (val.length > 0) {
                      val = val.substring(0, 1).toUpperCase() + val.substring(1).toLowerCase();
                    }
                    setUsername(val); 
                    setError(null); 
                  }}
                  placeholder="Username"
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Password"
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl flex items-center justify-center font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-white/50">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); setUsername(''); setPassword(''); }}
              className="text-white hover:text-pink-400 font-bold transition-colors ml-1 focus:outline-none"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

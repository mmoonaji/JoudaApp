import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type AdminPasswordResetProps = {
  onDone: () => void;
  onCancel: () => void;
};

export const AdminPasswordReset: React.FC<AdminPasswordResetProps> = ({ onDone, onCancel }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onDone();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'تعذر تحديث كلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <KeyRound className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-2">تعيين كلمة مرور جديدة</h2>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8">
            أدخل كلمة المرور الجديدة للحساب الإداري.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl flex items-start gap-3 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p>تم تحديث كلمة المرور بنجاح.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">تأكيد كلمة المرور</label>
              <input
                type="password"
                required
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>حفظ كلمة المرور</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button onClick={onCancel} className="text-sm font-bold text-gray-500 hover:text-brand-600 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            <span>العودة للدخول</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};

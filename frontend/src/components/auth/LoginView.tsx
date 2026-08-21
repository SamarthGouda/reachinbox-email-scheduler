import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, demoLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('oliver.brown@domain.io');
  const [password, setPassword] = useState('password123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await demoLogin(email, email.split('@')[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
      {/* Centered Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 sm:p-10 flex flex-col items-center">
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">Login</h1>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={isLoading || isSubmitting}
          className="w-full py-3 px-4 bg-[#EAF7ED] hover:bg-[#D8F2DD] text-gray-800 font-medium rounded-xl flex items-center justify-center space-x-3 transition-colors duration-150 mb-6"
        >
          {/* Google G Logo SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span className="text-gray-700 text-sm font-medium">Login with Google</span>
        </button>

        {/* Divider */}
        <div className="w-full flex items-center justify-center my-4">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="px-3 text-xs text-gray-400 font-normal">or sign up through email</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailLogin} className="w-full space-y-4 mt-2">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              required
              className="w-full px-4 py-3.5 bg-[#F4F5F7] border border-transparent rounded-xl text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full px-4 py-3.5 bg-[#F4F5F7] border border-transparent rounded-xl text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="w-full py-3.5 bg-[#00A859] hover:bg-[#00964D] text-white font-medium rounded-xl text-sm transition-all duration-150 shadow-sm mt-4 active:scale-[0.99] flex items-center justify-center"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

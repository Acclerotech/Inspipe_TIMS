import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const DEMO_USERS = [
  { email: 'maya.shah@rph.nl', role: 'INTEGRITY_ENGINEER' },
  { email: 'r.patel@inspipe.com', role: 'INSPECTOR' },
  { email: 'r.khan@inspipe.com', role: 'INSPECTOR' },
  { email: 'j.lilley@inspipe.com', role: 'INSPECTOR' },
  { email: 'a.patel@rph.nl', role: 'INTEGRITY_MANAGER' },
  { email: 'd.visser@acclero.com', role: 'INTEGRITY_ENGINEER' },
];

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(DEMO_USERS[0].email);
  const [loading, setLoading] = useState(false);

  const selectedUser = DEMO_USERS.find(u => u.email === email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email);

      requestAnimationFrame(() => {
        navigate('/', { replace: true });
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">

      <div className="w-full max-w-sm">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <Activity className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Acclero-Inspipe TIMS
          </h1>

          <p className="text-slate-400 text-sm mt-1">
            Tank Integrity Management System
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          <h2 className="text-lg font-bold text-slate-800 mb-1">
            Sign in (MVP Demo)
          </h2>

          <p className="text-sm text-slate-400 mb-4">
            Select a demo user or enter email
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* EMAIL INPUT */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="user@acclero.com"
            />

            {/* ROLE PREVIEW */}
            {selectedUser && (
              <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2 text-slate-600">
                Role:{" "}
                <span className="font-semibold text-slate-800">
                  {selectedUser.role.split('_').join(' ')}
                </span>
              </div>
            )}

            {/* ERROR */}
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {error}
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* DEMO USERS LIST */}
          <div className="mt-6 pt-4 border-t border-slate-100">

            <p className="text-[11px] text-slate-400 mb-2 uppercase tracking-wider font-semibold">
              MVP Demo Users (Role Based)
            </p>

            <div className="space-y-1">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => setEmail(u.email)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded transition ${
                    email === u.email
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{u.email}</span>
                    <span className="text-[10px] text-slate-400">
                      {u.role.split('_').join(' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <p className="text-center text-slate-500 text-xs mt-6">
          MVP Demo Mode — Role-based access simulation
        </p>

      </div>
    </div>
  );
}
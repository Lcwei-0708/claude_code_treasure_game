import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { signIn, signUp, type User } from '../api';

interface AuthScreenProps {
  onSignedIn: (user: User) => void;
  onCancel: () => void;
}

// Styles for inputs (inline because Tailwind is precompiled and lacks some utilities)
const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.375rem',
  border: '1px solid #fcd34d',
  background: '#fff',
};

// Sign-in / sign-up form; calls onSignedIn on success, or onCancel to go back to the game as a guest
export default function AuthScreen({ onSignedIn, onCancel }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Submit the form to the sign-in or sign-up endpoint depending on mode
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = mode === 'signin' ? await signIn(username, password) : await signUp(username, password);
      onSignedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
      <p className="text-amber-800 mb-8">
        {mode === 'signin' ? 'Sign in to save your scores' : 'Create an account to save your scores'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 p-6 bg-amber-200/80 rounded-xl shadow-lg border-2 border-amber-400"
        style={{ width: '100%', maxWidth: '22rem' }}
      >
        <label className="flex flex-col gap-2 text-amber-900 text-sm">
          Username
          <input
            style={inputStyle}
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-amber-900 text-sm">
          Password
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
          />
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </Button>

        <button
          type="button"
          className="text-amber-800 text-sm underline cursor-pointer"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>

      <button type="button" className="mt-4 text-amber-700 underline cursor-pointer" onClick={onCancel}>
        ← Back to game (keep playing as guest)
      </button>
    </div>
  );
}

import { useState } from 'react';

interface LoginProps {
  onLogin: (name: string, password: string) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && password.trim()) {
      onLogin(name.trim(), password.trim());
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Live Quiz Game</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>
          Login / Register
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '2rem',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    width: '100%',
    maxWidth: '400px',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  input: {
    padding: '12px',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  button: {
    padding: '12px',
    fontSize: '1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
  },
};

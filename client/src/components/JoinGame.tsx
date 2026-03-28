import { useState } from 'react';

interface JoinGameProps {
  onJoinGame: (code: string) => void;
  onBack: () => void;
}

export const JoinGame = ({ onJoinGame, onBack }: JoinGameProps) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      onJoinGame(code.trim().toUpperCase());
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Join Quiz Game</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <p style={styles.instruction}>Enter the 6-character room code:</p>
        <input
          type="text"
          placeholder="ABCD12"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          style={styles.input}
          required
        />
        <div style={styles.buttonRow}>
          <button type="button" onClick={onBack} style={styles.backButton}>
            Back
          </button>
          <button type="submit" disabled={code.length !== 6} style={styles.submitButton}>
            Join Game
          </button>
        </div>
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
  instruction: {
    textAlign: 'center' as const,
    color: '#666',
    marginBottom: '0.5rem',
  },
  input: {
    padding: '12px',
    fontSize: '1.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    textAlign: 'center' as const,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem',
  },
  backButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold' as const,
  },
};

interface RoleSelectionProps {
  playerName: string;
  onSelectHost: () => void;
  onSelectPlayer: () => void;
}

export const RoleSelection = ({ playerName, onSelectHost, onSelectPlayer }: RoleSelectionProps) => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome, {playerName}!</h1>
      <p style={styles.subtitle}>Choose your role:</p>
      <div style={styles.buttonContainer}>
        <button onClick={onSelectHost} style={{ ...styles.button, ...styles.hostButton }}>
          Create Game (Host)
        </button>
        <button onClick={onSelectPlayer} style={{ ...styles.button, ...styles.playerButton }}>
          Join Game (Player)
        </button>
      </div>
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
    marginBottom: '1rem',
    color: '#333',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '2rem',
    color: '#666',
  },
  buttonContainer: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  button: {
    padding: '20px 40px',
    fontSize: '1.2rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    minWidth: '200px',
  },
  hostButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  playerButton: {
    backgroundColor: '#007bff',
    color: 'white',
  },
};

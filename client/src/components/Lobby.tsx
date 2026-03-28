import type { Player } from '../types';

interface LobbyProps {
  gameCode: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
}

export const Lobby = ({
  gameCode,
  players,
  isHost,
  onStartGame,
}: LobbyProps) => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Game Lobby</h1>

      <div style={styles.codeCard}>
        <p style={styles.codeLabel}>Room Code:</p>
        <p style={styles.code}>{gameCode}</p>
        <p style={styles.instruction}>Share this code with other players</p>
      </div>

      <div style={styles.playersCard}>
        <h2 style={styles.playersTitle}>Players ({players.length})</h2>
        <div style={styles.playersList}>
          {players.map((player) => (
            <div key={String(player.index)} style={styles.playerItem}>
              <span style={styles.playerName}>{player.name}</span>
              <span style={styles.scoreText}>{player.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div style={styles.hostControls}>
          <button
            onClick={onStartGame}
            disabled={players.length < 1}
            style={styles.startButton}
          >
            Start Game
          </button>
        </div>
      )}

      {!isHost && (
        <p style={styles.waitingText}>Waiting for host to start the game...</p>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '2rem',
    color: '#333',
  },
  codeCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
    marginBottom: '2rem',
    minWidth: '300px',
  },
  codeLabel: {
    fontSize: '1rem',
    color: '#666',
    margin: 0,
    marginBottom: '0.5rem',
  },
  code: {
    fontSize: '3rem',
    fontWeight: 'bold' as const,
    color: '#007bff',
    margin: 0,
    marginBottom: '0.5rem',
    letterSpacing: '0.2em',
  },
  instruction: {
    fontSize: '0.9rem',
    color: '#999',
    margin: 0,
  },
  playersCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '500px',
    marginBottom: '2rem',
  },
  playersTitle: {
    fontSize: '1.5rem',
    marginTop: 0,
    marginBottom: '1rem',
    color: '#333',
  },
  playersList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  playerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  playerName: {
    fontSize: '1rem',
    color: '#333',
  },
  scoreText: {
    fontSize: '0.9rem',
    color: '#666',
  },
  hostControls: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  startButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1.2rem',
    fontWeight: 'bold' as const,
  },
  waitingText: {
    fontSize: '1.2rem',
    color: '#666',
    fontStyle: 'italic' as const,
  },
};

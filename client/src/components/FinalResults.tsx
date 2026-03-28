interface FinalResultsProps {
  scoreboard: { name: string; score: number; rank: number }[];
  onPlayAgain: () => void;
}

export const FinalResults = ({ scoreboard, onPlayAgain }: FinalResultsProps) => {
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Game Over!</h1>

      <div style={styles.podiumCard}>
        <h2 style={styles.podiumTitle}>Final Scoreboard</h2>
        <div style={styles.scoresList}>
          {scoreboard.map((entry) => (
            <div
              key={entry.name}
              style={{
                ...styles.scoreItem,
                ...(entry.rank === 1 ? styles.firstPlace : {}),
              }}
            >
              <div style={styles.scoreRank}>
                {getMedalEmoji(entry.rank)} #{entry.rank}
              </div>
              <div style={styles.scoreName}>{entry.name}</div>
              <div style={styles.scorePoints}>{entry.score} pts</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onPlayAgain} style={styles.playAgainButton}>
        Return to Menu
      </button>
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
    justifyContent: 'center',
  },
  title: {
    fontSize: '3rem',
    marginBottom: '2rem',
    color: '#333',
    textAlign: 'center' as const,
  },
  podiumCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
    width: '100%',
    maxWidth: '600px',
    marginBottom: '2rem',
  },
  podiumTitle: {
    fontSize: '1.5rem',
    marginTop: 0,
    marginBottom: '1.5rem',
    textAlign: 'center' as const,
    color: '#333',
  },
  scoresList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  scoreItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    transition: 'transform 0.2s',
  },
  firstPlace: {
    backgroundColor: '#fff3cd',
    border: '2px solid #ffc107',
    transform: 'scale(1.05)',
  },
  scoreRank: {
    fontSize: '1.5rem',
    fontWeight: 'bold' as const,
    color: '#007bff',
    minWidth: '80px',
  },
  scoreName: {
    flex: 1,
    fontSize: '1.2rem',
    fontWeight: 'bold' as const,
  },
  scorePoints: {
    fontSize: '1.3rem',
    fontWeight: 'bold' as const,
    color: '#28a745',
  },
  playAgainButton: {
    padding: '15px 40px',
    fontSize: '1.2rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
  },
};

import type { PlayerResult } from '../types';

interface QuestionResultProps {
  questionIndex: number;
  correctIndex: number;
  playerResults: PlayerResult[];
  options: string[];
}

export const QuestionResult = ({
  questionIndex,
  correctIndex,
  playerResults,
  options,
}: QuestionResultProps) => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Question {questionIndex + 1} Results</h1>

      <div style={styles.correctAnswerCard}>
        <h2 style={styles.correctAnswerTitle}>Correct Answer:</h2>
        <p style={styles.correctAnswerText}>
          {String.fromCharCode(65 + correctIndex)} - {options[correctIndex]}
        </p>
      </div>

      <div style={styles.answersCard}>
        <h2 style={styles.sectionTitle}>Player Results</h2>
        <div style={styles.answersList}>
          {playerResults.map((result) => (
            <div
              key={result.name}
              style={{
                ...styles.answerItem,
                ...(result.correct ? styles.correctItem : styles.incorrectItem),
              }}
            >
              <div style={styles.answerInfo}>
                <span style={styles.playerName}>{result.name}</span>
                <span style={styles.answerStatus}>
                  {result.answered ? (result.correct ? 'Correct' : 'Wrong') : 'No answer'}
                </span>
              </div>
              <div style={styles.answerStats}>
                <span style={styles.points}>+{result.pointsEarned} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.scoresCard}>
        <h2 style={styles.sectionTitle}>Current Scores</h2>
        <div style={styles.scoresList}>
          {[...playerResults]
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((result, index) => (
              <div key={result.name} style={styles.scoreItem}>
                <div style={styles.scoreRank}>#{index + 1}</div>
                <div style={styles.scoreName}>{result.name}</div>
                <div style={styles.scorePoints}>{result.totalScore} pts</div>
              </div>
            ))}
        </div>
      </div>

      <p style={styles.nextText}>Next question starting soon...</p>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    maxWidth: '900px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2rem',
    textAlign: 'center' as const,
    marginBottom: '2rem',
    color: '#333',
  },
  correctAnswerCard: {
    backgroundColor: '#d4edda',
    padding: '2rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    textAlign: 'center' as const,
    border: '2px solid #28a745',
  },
  correctAnswerTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.5rem',
    color: '#155724',
  },
  correctAnswerText: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: 'bold' as const,
    color: '#155724',
  },
  answersCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  scoresCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.3rem',
    color: '#333',
  },
  answersList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  answerItem: {
    padding: '1rem',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  correctItem: {
    backgroundColor: '#d4edda',
    border: '1px solid #28a745',
  },
  incorrectItem: {
    backgroundColor: '#f8d7da',
    border: '1px solid #dc3545',
  },
  answerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  playerName: {
    fontSize: '1rem',
    fontWeight: 'bold' as const,
  },
  answerStatus: {
    padding: '4px 8px',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: '4px',
    fontWeight: 'bold' as const,
    fontSize: '0.85rem',
  },
  answerStats: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  points: {
    fontSize: '1rem',
    fontWeight: 'bold' as const,
    color: '#28a745',
  },
  scoresList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  scoreItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  scoreRank: {
    fontSize: '1.2rem',
    fontWeight: 'bold' as const,
    color: '#007bff',
    minWidth: '40px',
  },
  scoreName: {
    flex: 1,
    fontSize: '1rem',
  },
  scorePoints: {
    fontSize: '1.1rem',
    fontWeight: 'bold' as const,
    color: '#333',
  },
  nextText: {
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    color: '#666',
    fontStyle: 'italic' as const,
  },
};

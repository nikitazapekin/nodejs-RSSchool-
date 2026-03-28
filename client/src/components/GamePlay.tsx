import { useState, useEffect } from 'react';

interface GamePlayProps {
  questionNumber: number;
  text: string;
  options: string[];
  timeLimitSec: number;
  totalQuestions: number;
  onAnswer: (answerIndex: number) => void;
  isHost: boolean;
  hasAnswered: boolean;
}

export const GamePlay = ({
  questionNumber,
  text,
  options,
  timeLimitSec,
  totalQuestions,
  onAnswer,
  isHost,
  hasAnswered,
}: GamePlayProps) => {
  const [timeRemaining, setTimeRemaining] = useState(timeLimitSec);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  useEffect(() => {
    setTimeRemaining(timeLimitSec);
    setSelectedAnswer(null);
  }, [questionNumber, timeLimitSec]);

  useEffect(() => {
    if (hasAnswered) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questionNumber, hasAnswered]);

  const handleAnswer = (answerIndex: number) => {
    if (!isHost && !hasAnswered) {
      setSelectedAnswer(answerIndex);
      onAnswer(answerIndex);
    }
  };

  const progressPercent = (timeRemaining / timeLimitSec) * 100;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.questionNumber}>
          Question {questionNumber} of {totalQuestions}
        </div>
      </div>

      <div style={styles.timerContainer}>
        <div
          style={{
            ...styles.timerBar,
            width: `${progressPercent}%`,
            backgroundColor:
              progressPercent > 50 ? '#28a745' : progressPercent > 25 ? '#ffc107' : '#dc3545',
          }}
        />
      </div>
      <div style={styles.timerText}>{timeRemaining}s remaining</div>

      <div style={styles.questionCard}>
        <h2 style={styles.question}>{text}</h2>
      </div>

      {isHost ? (
        <div style={styles.hostView}>
          <p style={styles.hostViewText}>You are the host. Waiting for players to answer...</p>
          <div style={styles.optionsGrid}>
            {options.map((option, index) => (
              <div key={index} style={styles.optionDisplay}>
                <span style={styles.optionLabel}>{String.fromCharCode(65 + index)}</span>
                <span style={styles.optionText}>{option}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={styles.optionsGrid}>
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={hasAnswered}
                style={{
                  ...styles.optionButton,
                  ...(selectedAnswer === index ? styles.selectedOption : {}),
                  ...(hasAnswered ? styles.disabledOption : {}),
                }}
              >
                <span style={styles.optionLabel}>{String.fromCharCode(65 + index)}</span>
                <span style={styles.optionText}>{option}</span>
              </button>
            ))}
          </div>

          {hasAnswered && (
            <p style={styles.answeredText}>Answer submitted! Waiting for other players...</p>
          )}
        </>
      )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  questionNumber: {
    fontSize: '1.2rem',
    fontWeight: 'bold' as const,
    color: '#333',
  },
  timerContainer: {
    width: '100%',
    height: '30px',
    backgroundColor: '#e9ecef',
    borderRadius: '15px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  timerBar: {
    height: '100%',
    transition: 'width 1s linear, background-color 0.3s',
  },
  timerText: {
    textAlign: 'center' as const,
    fontSize: '1.5rem',
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: '2rem',
  },
  questionCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  question: {
    fontSize: '1.5rem',
    margin: 0,
    color: '#333',
    textAlign: 'center' as const,
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  hostView: {
    textAlign: 'center' as const,
  },
  hostViewText: {
    fontSize: '1.1rem',
    color: '#666',
    fontStyle: 'italic' as const,
    marginBottom: '1.5rem',
  },
  optionDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: 'white',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    textAlign: 'left' as const,
    opacity: 0.7,
  },
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: 'white',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
  },
  selectedOption: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
  },
  disabledOption: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  optionLabel: {
    fontWeight: 'bold' as const,
    fontSize: '1.2rem',
    minWidth: '30px',
  },
  optionText: {
    flex: 1,
  },
  answeredText: {
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    color: '#28a745',
    fontWeight: 'bold' as const,
  },
};

import { useState, useRef } from 'react';
import type { Question } from '../types';

interface CreateGameProps {
  onCreateGame: (questions: Question[]) => void;
  onBack: () => void;
}

interface QuestionForm {
  text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: number;
  timeLimit: number;
}

const emptyQuestion: QuestionForm = {
  text: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  correctAnswer: 0,
  timeLimit: 30,
};

export const CreateGame = ({ onCreateGame, onBack }: CreateGameProps) => {
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof QuestionForm, value: string | number) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedQuestions: Question[] = questions.map((q) => ({
      text: q.text,
      options: [q.option1, q.option2, q.option3, q.option4],
      correctIndex: q.correctAnswer,
      timeLimitSec: q.timeLimit,
    }));

    onCreateGame(formattedQuestions);
  };

  const handleExport = () => {
    const exported = {
      schemaVersion: 1,
      questions: questions.map((q) => ({
        text: q.text,
        options: [q.option1, q.option2, q.option3, q.option4],
        correctIndex: q.correctAnswer,
        timeLimitSec: q.timeLimit,
      })),
    };

    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz-questions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const imported: Question[] = parsed.questions;

        if (!Array.isArray(imported) || imported.length === 0) {
          alert('Invalid file: no questions found');
          return;
        }

        for (const q of imported) {
          if (
            !q.text ||
            !Array.isArray(q.options) ||
            q.options.length !== 4 ||
            typeof q.correctIndex !== 'number' ||
            q.correctIndex < 0 ||
            q.correctIndex > 3 ||
            typeof q.timeLimitSec !== 'number' ||
            q.timeLimitSec <= 0
          ) {
            alert('Invalid file: one or more questions have incorrect format');
            return;
          }
        }

        // Map imported questions into form state
        const formQuestions: QuestionForm[] = imported.map((q) => ({
          text: q.text,
          option1: q.options[0],
          option2: q.options[1],
          option3: q.options[2],
          option4: q.options[3],
          correctAnswer: q.correctIndex,
          timeLimit: q.timeLimitSec,
        }));

        setQuestions(formQuestions);
      } catch {
        alert('Invalid file: could not parse JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isValid = questions.every(
    (q) =>
      q.text.trim() &&
      q.option1.trim() &&
      q.option2.trim() &&
      q.option3.trim() &&
      q.option4.trim() &&
      q.timeLimit > 0
  );

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create Quiz Game</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.importExportRow}>
          <button type="button" onClick={handleImportClick} style={styles.importButton}>
            Import Questions
          </button>
          <button type="button" onClick={handleExport} style={styles.exportButton}>
            Export Questions
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {questions.map((question, index) => (
          <div key={index} style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <h3 style={styles.questionTitle}>Question {index + 1}</h3>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  style={styles.removeButton}
                >
                  Remove
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Question text"
              value={question.text}
              onChange={(e) => updateQuestion(index, 'text', e.target.value)}
              style={styles.input}
              required
            />

            <div style={styles.optionsGrid}>
              {[1, 2, 3, 4].map((optNum) => (
                <div key={optNum} style={styles.optionRow}>
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={question.correctAnswer === optNum - 1}
                    onChange={() => updateQuestion(index, 'correctAnswer', optNum - 1)}
                  />
                  <input
                    type="text"
                    placeholder={`Option ${optNum}`}
                    value={question[`option${optNum}` as keyof QuestionForm] as string}
                    onChange={(e) =>
                      updateQuestion(index, `option${optNum}` as keyof QuestionForm, e.target.value)
                    }
                    style={styles.optionInput}
                    required
                  />
                </div>
              ))}
            </div>

            <div style={styles.timeLimitRow}>
              <label>Time Limit (seconds):</label>
              <input
                type="number"
                min="5"
                max="300"
                value={question.timeLimit}
                onChange={(e) => updateQuestion(index, 'timeLimit', parseInt(e.target.value))}
                style={styles.timeLimitInput}
                required
              />
            </div>
          </div>
        ))}

        <button type="button" onClick={addQuestion} style={styles.addButton}>
          Add Question
        </button>

        <div style={styles.buttonRow}>
          <button type="button" onClick={onBack} style={styles.backButton}>
            Back
          </button>
          <button type="submit" disabled={!isValid} style={styles.submitButton}>
            Create Game
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  title: {
    fontSize: '2rem',
    textAlign: 'center' as const,
    marginBottom: '2rem',
    color: '#333',
  },
  form: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  importExportRow: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  importButton: {
    padding: '10px 20px',
    backgroundColor: '#fd7e14',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  questionCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  questionTitle: {
    margin: 0,
    color: '#333',
  },
  removeButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '1rem',
    boxSizing: 'border-box' as const,
  },
  optionsGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  optionInput: {
    flex: 1,
    padding: '10px',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  timeLimitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  timeLimitInput: {
    width: '100px',
    padding: '8px',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  addButton: {
    padding: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold' as const,
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold' as const,
  },
};

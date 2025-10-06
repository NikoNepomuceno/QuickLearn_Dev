// Quiz service for handling quiz operations like download, share, etc.

// export function downloadQuizAsJSON(quiz) {
//   const quizData = {
//     title: quiz.title,
//     description: quiz.description,
//     questions: quiz.questions,
//     generatedAt: new Date().toISOString(),
//     version: '1.0'
//   }

//   const dataStr = JSON.stringify(quizData, null, 2)
//   const dataBlob = new Blob([dataStr], { type: 'application/json' })

//   const link = document.createElement('a')
//   link.href = URL.createObjectURL(dataBlob)
//   link.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_quiz.json`
//   document.body.appendChild(link)
//   link.click()
//   document.body.removeChild(link)
//   URL.revokeObjectURL(link.href)
// }

export function downloadQuizAsPDF(quiz) {
  // For now, we'll create a simple text-based PDF using the browser's print functionality
  // In a production app, you might want to use a library like jsPDF or Puppeteer

  const printWindow = window.open('', '_blank')
  const htmlContent = generateQuizHTML(quiz)

  printWindow.document.write(htmlContent)
  printWindow.document.close()

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }
}

export function downloadResultsAsPDF(quiz, attempt) {
  const printWindow = window.open('', '_blank')
  const htmlContent = generateResultsHTML(quiz, attempt)
  printWindow.document.write(htmlContent)
  printWindow.document.close()
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }
}

function generateQuizHTML(quiz) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${quiz.title}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          line-height: 1.6;
          color: #333;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 3px solid #667eea;
        }
        h1 {
          color: #1f2937;
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .description {
          color: #6b7280;
          font-size: 18px;
          margin: 0;
          font-style: italic;
        }
        .quiz-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 20px 0;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 14px;
          color: #6b7280;
        }
        .question {
          margin-bottom: 35px;
          padding: 25px;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          page-break-inside: avoid;
        }
        .question-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .question-number {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }
        .question-text {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .choices {
          margin: 20px 0;
          display: grid;
          gap: 8px;
        }
        .choice {
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .choice-letter {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #e2e8f0;
          color: #6b7280;
          border-radius: 50%;
          font-weight: 600;
          font-size: 12px;
          flex-shrink: 0;
        }
        .answer {
          margin-top: 20px;
          padding: 16px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 1px solid #bbf7d0;
          border-radius: 12px;
        }
        .answer-label {
          font-weight: 600;
          color: #059669;
          margin-bottom: 8px;
        }
        .answer-value {
          color: #1f2937;
          font-weight: 500;
        }
        .explanation {
          margin-top: 12px;
          padding: 16px;
          background: rgba(102, 126, 234, 0.08);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 8px;
        }
        .explanation-label {
          font-weight: 600;
          color: #667eea;
          margin-bottom: 8px;
        }
        .explanation-text {
          font-style: italic;
          color: #4b5563;
          line-height: 1.6;
        }
        .footer {
          margin-top: 60px;
          text-align: center;
          padding-top: 30px;
          border-top: 1px solid #e5e7eb;
          color: #9ca3af;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; padding: 20px; }
          .question { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${quiz.title}</h1>
        ${quiz.description ? `<p class="description">${quiz.description}</p>` : ''}
        <div class="quiz-meta">
          <span>Total Questions: ${quiz.questions.length}</span>
          <span>Generated: ${new Date().toLocaleDateString()}</span>
        </div>
      </div>

      ${quiz.questions.map((question, index) => `
        <div class="question">
          <div class="question-header">
            <div class="question-number">Question ${index + 1}</div>
          </div>
          <div class="question-text">${question.question}</div>
          <div class="choices">
            ${question.choices.map((choice, choiceIndex) => `
              <div class="choice">
                <div class="choice-letter">${String.fromCharCode(65 + choiceIndex)}</div>
                <div>${choice}</div>
              </div>
            `).join('')}
          </div>
          <div class="answer">
            <div class="answer-label">Correct Answer:</div>
            <div class="answer-value">${question.answer}</div>
            ${question.explanation ? `
              <div class="explanation">
                <div class="explanation-label">Explanation:</div>
                <div class="explanation-text">${question.explanation}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}

      <div class="footer">
        Generated by QuickLearn • ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `
}

export function generateShareableLink(quiz) {
  // Generate a unique ID for the quiz
  const quizId = generateQuizId()

  // Store quiz in localStorage with the ID (in a real app, this would be stored on a server)
  const quizData = {
    ...quiz,
    id: quizId,
    createdAt: new Date().toISOString()
  }

  localStorage.setItem(`quiz_${quizId}`, JSON.stringify(quizData))

  // Generate the shareable link
  const baseUrl = window.location.origin
  const shareableLink = `${baseUrl}/quiz/${quizId}`

  return shareableLink
}

export function generateResultsShareLink(quizId) {
  const baseUrl = window.location.origin
  return `${baseUrl}/quiz/${quizId}/results`
}

export function getQuizById(quizId) {
  const quizData = localStorage.getItem(`quiz_${quizId}`)
  return quizData ? JSON.parse(quizData) : null
}

export function saveQuizToHistory(quiz) {
  // Ensure quiz has an ID and createdAt
  const hasId = typeof quiz?.id === 'string' && quiz.id.length > 0
  const quizId = hasId ? quiz.id : generateQuizId()
  const quizToSave = {
    ...quiz,
    id: quizId,
    createdAt: quiz.createdAt || new Date().toISOString()
  }

  // Save full quiz by id
  localStorage.setItem(`quiz_${quizId}`, JSON.stringify(quizToSave))

  // Update history list (store only ids, most recent first)
  const historyKey = 'quiz_history'
  const existing = JSON.parse(localStorage.getItem(historyKey) || '[]')
  const filtered = existing.filter((id) => id !== quizId)
  const updated = [quizId, ...filtered].slice(0, 20)
  localStorage.setItem(historyKey, JSON.stringify(updated))

  // Preserve any existing attempts if present
  const existingAttempts = getQuizAttempts(quizId)
  if (!Array.isArray(existingAttempts)) {
    localStorage.setItem(`quiz_${quizId}_attempts`, JSON.stringify([]))
  }

  return quizToSave
}

export function getQuizHistory() {
  const historyKey = 'quiz_history'
  const ids = JSON.parse(localStorage.getItem(historyKey) || '[]')
  return ids
}

export function getQuizHistoryDetailed() {
  const ids = getQuizHistory()
  return ids
    .map((id) => getQuizById(id))
    .filter(Boolean)
}

// Attempts management
export function getQuizAttempts(quizId) {
  try {
    const raw = localStorage.getItem(`quiz_${quizId}_attempts`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveQuizAttempt(quizId, attempt) {
  // attempt: { score: number (0-100), timeSeconds?: number, takenAt?: iso, userAnswers?: Array<string|null> }
  const attempts = getQuizAttempts(quizId)
  const record = {
    score: typeof attempt?.score === 'number' ? Math.max(0, Math.min(100, Math.round(attempt.score))) : 0,
    timeSeconds: typeof attempt?.timeSeconds === 'number' ? Math.max(0, Math.floor(attempt.timeSeconds)) : undefined,
    takenAt: attempt?.takenAt || new Date().toISOString(),
    userAnswers: Array.isArray(attempt?.userAnswers) ? attempt.userAnswers : undefined
  }
  const updated = [record, ...attempts].slice(0, 50)
  localStorage.setItem(`quiz_${quizId}_attempts`, JSON.stringify(updated))
  return record
}

export function getQuizSummary(quizOrId) {
  const quizId = typeof quizOrId === 'string' ? quizOrId : quizOrId?.id
  if (!quizId) return { lastScore: null, bestScore: null, attemptsCount: 0 }
  const attempts = getQuizAttempts(quizId)
  if (!attempts.length) return { lastScore: null, bestScore: null, attemptsCount: 0 }
  const lastScore = attempts[0]?.score ?? null
  const bestScore = attempts.reduce((m, a) => (typeof a.score === 'number' && a.score > m ? a.score : m), 0)
  return { lastScore, bestScore, attemptsCount: attempts.length }
}

function generateQuizId() {
  // Generate a simple unique ID (in production, use a proper UUID library)
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

export function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    return new Promise((resolve, reject) => {
      if (document.execCommand('copy')) {
        resolve()
      } else {
        reject(new Error('Unable to copy to clipboard'))
      }
      document.body.removeChild(textArea)
    })
  }
}

function generateResultsHTML(quiz, attempt) {
  const score = typeof attempt?.score === 'number' ? attempt.score : 0
  const takenAt = attempt?.takenAt ? new Date(attempt.takenAt).toLocaleString() : 'N/A'
  const timeText = typeof attempt?.timeSeconds === 'number' ? `${Math.floor(attempt.timeSeconds/60)}m ${(attempt.timeSeconds%60)}s` : 'N/A'

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent!'
    if (score >= 80) return 'Great Job!'
    if (score >= 70) return 'Good Work!'
    if (score >= 60) return 'Not Bad!'
    return 'Keep Trying!'
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${quiz.title} - Results</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          line-height: 1.6;
          color: #333;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 3px solid #667eea;
        }
        h1 {
          color: #1f2937;
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .score-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          margin: 30px 0;
          padding: 30px;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: ${getScoreColor(score)};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
        }
        .score-number {
          font-size: 32px;
          margin-bottom: 4px;
        }
        .score-label {
          font-size: 12px;
          opacity: 0.9;
          text-transform: uppercase;
        }
        .score-details {
          display: grid;
          gap: 16px;
        }
        .detail-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .detail-label {
          font-weight: 600;
          color: #6b7280;
          min-width: 80px;
        }
        .detail-value {
          color: #1f2937;
          font-weight: 500;
        }
        .performance-label {
          font-size: 18px;
          font-weight: 600;
          color: ${getScoreColor(score)};
          margin-top: 8px;
        }
        .questions-section {
          margin-top: 40px;
        }
        .section-title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }
        .question {
          margin-bottom: 24px;
          padding: 24px;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          page-break-inside: avoid;
        }
        .question.correct {
          border: 2px solid #10b981;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }
        .question.incorrect {
          border: 2px solid #ef4444;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }
        .question-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .question-number {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }
        .result-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }
        .result-indicator.correct {
          color: #059669;
        }
        .result-indicator.incorrect {
          color: #dc2626;
        }
        .question-text {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .answer-section {
          display: grid;
          gap: 12px;
        }
        .answer-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .answer-label {
          font-weight: 600;
          font-size: 14px;
          min-width: 120px;
          flex-shrink: 0;
        }
        .answer-value {
          font-size: 14px;
          line-height: 1.5;
          font-weight: 500;
        }
        .your-answer .answer-label {
          color: #6b7280;
        }
        .correct-answer .answer-label {
          color: #059669;
        }
        .explanation {
          background: rgba(102, 126, 234, 0.08);
          border: 1px solid rgba(102, 126, 234, 0.2);
        }
        .explanation .answer-label {
          color: #667eea;
        }
        .explanation .answer-value {
          font-style: italic;
          color: #4b5563;
        }
        .footer {
          margin-top: 60px;
          text-align: center;
          padding-top: 30px;
          border-top: 1px solid #e5e7eb;
          color: #9ca3af;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; padding: 20px; }
          .question { page-break-inside: avoid; }
          .score-section { flex-direction: column; gap: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${quiz.title}</h1>
        <div class="score-section">
          <div class="score-circle">
            <div class="score-number">${score}%</div>
            <div class="score-label">Score</div>
          </div>
          <div class="score-details">
            <div class="detail-item">
              <div class="detail-label">Taken:</div>
              <div class="detail-value">${takenAt}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Time:</div>
              <div class="detail-value">${timeText}</div>
            </div>
            <div class="performance-label">${getScoreLabel(score)}</div>
          </div>
        </div>
      </div>

      <div class="questions-section">
        <div class="section-title">Question Review</div>
        ${quiz.questions.map((q, i) => {
          const ua = (attempt && Array.isArray(attempt.userAnswers)) ? (attempt.userAnswers[i] ?? 'Not answered') : 'Not answered'
          const correct = ua === q.answer
          return `
          <div class="question ${correct ? 'correct' : 'incorrect'}">
            <div class="question-header">
              <div class="question-number">Question ${i + 1}</div>
              <div class="result-indicator ${correct ? 'correct' : 'incorrect'}">
                ${correct ? '✓ Correct' : '✗ Incorrect'}
              </div>
            </div>
            <div class="question-text">${q.question}</div>
            <div class="answer-section">
              <div class="answer-row your-answer">
                <div class="answer-label">Your Answer:</div>
                <div class="answer-value">${ua}</div>
              </div>
              <div class="answer-row correct-answer">
                <div class="answer-label">Correct Answer:</div>
                <div class="answer-value">${q.answer}</div>
              </div>
              ${q.explanation ? `
                <div class="answer-row explanation">
                  <div class="answer-label">Explanation:</div>
                  <div class="answer-value">${q.explanation}</div>
                </div>
              ` : ''}
            </div>
          </div>`
        }).join('')}
      </div>

      <div class="footer">
        Generated by QuickLearn • ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `
}


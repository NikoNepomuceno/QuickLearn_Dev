/**
 * Mock service for adaptive quiz - simulates backend behavior
 * Used when VITE_MOCK_ADAPTIVE=true
 */

// In-memory session storage
const sessions = new Map()

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function generateMockQuestion(difficulty = 'medium', questionNumber = 1) {
  const topics = ['History', 'Science', 'Mathematics', 'Literature', 'Geography']
  const topic = topics[Math.floor(Math.random() * topics.length)]
  
  const difficulties = {
    easy: {
      stems: [
        'What is the capital of France?',
        'What is 2 + 2?',
        'What color is the sky on a clear day?'
      ],
      choices: [
        [
          { id: 'a', text: 'Paris' },
          { id: 'b', text: 'London' },
          { id: 'c', text: 'Berlin' },
          { id: 'd', text: 'Madrid' }
        ],
        [
          { id: 'a', text: '3' },
          { id: 'b', text: '4' },
          { id: 'c', text: '5' },
          { id: 'd', text: '6' }
        ],
        [
          { id: 'a', text: 'Blue' },
          { id: 'b', text: 'Green' },
          { id: 'c', text: 'Red' },
          { id: 'd', text: 'Yellow' }
        ]
      ],
      correctAnswers: ['a', 'b', 'a']
    },
    medium: {
      stems: [
        'Which planet is known as the Red Planet?',
        'Who wrote "Romeo and Juliet"?',
        'What is the square root of 144?'
      ],
      choices: [
        [
          { id: 'a', text: 'Mars' },
          { id: 'b', text: 'Venus' },
          { id: 'c', text: 'Jupiter' },
          { id: 'd', text: 'Saturn' }
        ],
        [
          { id: 'a', text: 'Charles Dickens' },
          { id: 'b', text: 'William Shakespeare' },
          { id: 'c', text: 'Jane Austen' },
          { id: 'd', text: 'Mark Twain' }
        ],
        [
          { id: 'a', text: '10' },
          { id: 'b', text: '11' },
          { id: 'c', text: '12' },
          { id: 'd', text: '13' }
        ]
      ],
      correctAnswers: ['a', 'b', 'c']
    },
    hard: {
      stems: [
        'What is the speed of light in vacuum (m/s)?',
        'Who developed the theory of general relativity?',
        'What is the derivative of x² with respect to x?'
      ],
      choices: [
        [
          { id: 'a', text: '299,792,458' },
          { id: 'b', text: '300,000,000' },
          { id: 'c', text: '299,000,000' },
          { id: 'd', text: '298,000,000' }
        ],
        [
          { id: 'a', text: 'Isaac Newton' },
          { id: 'b', text: 'Albert Einstein' },
          { id: 'c', text: 'Galileo Galilei' },
          { id: 'd', text: 'Stephen Hawking' }
        ],
        [
          { id: 'a', text: 'x' },
          { id: 'b', text: '2x' },
          { id: 'c', text: 'x²' },
          { id: 'd', text: '2x²' }
        ]
      ],
      correctAnswers: ['a', 'b', 'b']
    }
  }

  const pool = difficulties[difficulty]
  const index = questionNumber % pool.stems.length
  
  return {
    id: generateUUID(),
    type: 'multiple_choice',
    stem: pool.stems[index],
    choices: pool.choices[index],
    difficulty,
    topic,
    _correctAnswer: pool.correctAnswers[index]  // Hidden from client
  }
}

export const adaptiveMock = {
  /**
   * Create a new adaptive session
   */
  async createSession(file, options = {}) {
    await new Promise(resolve => setTimeout(resolve, 800)) // Simulate network delay
    
    const sessionId = generateUUID()
    const firstQuestion = generateMockQuestion('medium', 1)
    
    const session = {
      sessionId,
      status: 'active',
      stats: {
        asked: 0,
        correct: 0,
        wrongStreak: 0,
        currentDifficulty: 'medium'
      },
      questions: [firstQuestion],
      answers: [],
      maxQuestions: options.maxQuestions || 20,
      createdAt: new Date(),
      reviewSuggestionShownAt: null,
      difficultyCap: null,
      trajectory: []
    }
    
    sessions.set(sessionId, session)
    
    return {
      sessionId,
      question: {
        id: firstQuestion.id,
        type: firstQuestion.type,
        stem: firstQuestion.stem,
        choices: firstQuestion.choices,
        difficulty: firstQuestion.difficulty,
        topic: firstQuestion.topic
      }
    }
  },

  /**
   * Get session snapshot
   */
  async getSession(sessionId) {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    const lastQuestion = session.questions[session.questions.length - 1]
    const pendingQuestion = session.stats.asked < session.questions.length ? {
      id: lastQuestion.id,
      type: lastQuestion.type,
      stem: lastQuestion.stem,
      choices: lastQuestion.choices,
      difficulty: lastQuestion.difficulty,
      topic: lastQuestion.topic
    } : null
    
    return {
      sessionId,
      status: session.status,
      stats: { ...session.stats },
      pendingQuestion,
      maxQuestions: session.maxQuestions,
      createdAt: session.createdAt
    }
  },

  /**
   * Submit an answer
   */
  async submitAnswer(sessionId, questionId, answer) {
    await new Promise(resolve => setTimeout(resolve, 600))
    
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    const question = session.questions.find(q => q.id === questionId)
    if (!question) {
      throw new Error('Question not found')
    }
    
    // Check if correct
    const userAnswer = Array.isArray(answer) ? answer[0] : answer
    const isCorrect = userAnswer === question._correctAnswer
    
    // Update stats
    session.stats.asked++
    if (isCorrect) {
      session.stats.correct++
      session.stats.wrongStreak = 0
    } else {
      session.stats.wrongStreak++
    }
    
    // Record answer
    session.answers.push({
      questionId,
      answer,
      isCorrect,
      timestamp: new Date()
    })
    
    // Determine next difficulty (step up on 2 correct in a row, step down on wrong)
    const recentAnswers = session.answers.slice(-2)
    const allRecentCorrect = recentAnswers.length === 2 && recentAnswers.every(a => a.isCorrect)
    
    let nextDifficulty = session.stats.currentDifficulty
    if (allRecentCorrect && session.stats.currentDifficulty === 'easy') {
      nextDifficulty = 'medium'
    } else if (allRecentCorrect && session.stats.currentDifficulty === 'medium') {
      nextDifficulty = 'hard'
    } else if (!isCorrect && session.stats.currentDifficulty === 'hard') {
      nextDifficulty = 'medium'
    } else if (!isCorrect && session.stats.currentDifficulty === 'medium') {
      nextDifficulty = 'easy'
    }
    
    // Apply difficulty cap if set
    if (session.difficultyCap) {
      const capLevels = { easy: 0, medium: 1, hard: 2 }
      const currentLevels = { easy: 0, medium: 1, hard: 2 }
      if (currentLevels[nextDifficulty] > capLevels[session.difficultyCap]) {
        nextDifficulty = session.difficultyCap
      }
    }
    
    session.stats.currentDifficulty = nextDifficulty
    
    // Track trajectory
    session.trajectory.push({
      questionNumber: session.stats.asked,
      difficulty: session.stats.currentDifficulty
    })
    
    // Check for review suggestion (4 wrong in a row)
    let reviewSuggestion = null
    if (session.stats.wrongStreak >= 4 && !session.reviewSuggestionShownAt) {
      reviewSuggestion = {
        trigger: 'wrong_streak',
        streak: session.stats.wrongStreak,
        suggestions: {
          topics: ['Review basic concepts', 'Take a break'],
          easeTo: session.stats.currentDifficulty === 'hard' ? 'medium' : 'easy'
        }
      }
      session.reviewSuggestionShownAt = new Date()
    }
    
    // Generate next question if not at max
    let nextQuestion = null
    if (session.stats.asked < session.maxQuestions) {
      const newQuestion = generateMockQuestion(nextDifficulty, session.stats.asked + 1)
      session.questions.push(newQuestion)
      
      nextQuestion = {
        id: newQuestion.id,
        type: newQuestion.type,
        stem: newQuestion.stem,
        choices: newQuestion.choices,
        difficulty: newQuestion.difficulty,
        topic: newQuestion.topic
      }
    }
    
    return {
      correct: isCorrect,
      explanation: isCorrect 
        ? `Correct! The answer is ${question._correctAnswer}.`
        : `Incorrect. The correct answer is ${question._correctAnswer}.`,
      updatedStats: { ...session.stats },
      reviewSuggestion,
      nextQuestion
    }
  },

  /**
   * Get next question
   */
  async getNextQuestion(sessionId) {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    if (session.stats.asked >= session.maxQuestions) {
      return { question: null }
    }
    
    // If there's an unanswered question, return it
    if (session.stats.asked < session.questions.length) {
      const question = session.questions[session.stats.asked]
      return {
        question: {
          id: question.id,
          type: question.type,
          stem: question.stem,
          choices: question.choices,
          difficulty: question.difficulty,
          topic: question.topic
        }
      }
    }
    
    // Generate new question
    const newQuestion = generateMockQuestion(
      session.stats.currentDifficulty,
      session.stats.asked + 1
    )
    session.questions.push(newQuestion)
    
    return {
      question: {
        id: newQuestion.id,
        type: newQuestion.type,
        stem: newQuestion.stem,
        choices: newQuestion.choices,
        difficulty: newQuestion.difficulty,
        topic: newQuestion.topic
      }
    }
  },

  /**
   * Set session preferences
   */
  async setPreferences(sessionId, preferences) {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    if (preferences.difficultyCap) {
      session.difficultyCap = preferences.difficultyCap
      // Adjust current difficulty if it exceeds cap
      const capLevels = { easy: 0, medium: 1, hard: 2 }
      const currentLevels = { easy: 0, medium: 1, hard: 2 }
      if (currentLevels[session.stats.currentDifficulty] > capLevels[preferences.difficultyCap]) {
        session.stats.currentDifficulty = preferences.difficultyCap
      }
    }
    
    return {
      preferences: {
        difficultyCap: session.difficultyCap
      }
    }
  },

  /**
   * Finish session
   */
  async finishSession(sessionId) {
    await new Promise(resolve => setTimeout(resolve, 400))
    
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    session.status = 'completed'
    const finishedAt = new Date()
    const durationMs = finishedAt - session.createdAt
    
    const wrongStreakMax = Math.max(
      ...session.answers.map((_, idx, arr) => {
        let streak = 0
        for (let i = idx; i >= 0; i--) {
          if (!arr[i].isCorrect) streak++
          else break
        }
        return streak
      }),
      0
    )
    
    return {
      summary: {
        asked: session.stats.asked,
        correct: session.stats.correct,
        wrongStreakMax,
        trajectory: session.trajectory,
        finishedAt,
        durationMs
      }
    }
  }
}


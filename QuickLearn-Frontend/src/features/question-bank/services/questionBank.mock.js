/**
 * Mock service for Question Bank development/testing
 */

// Mock questions data
const mockQuestions = [
  {
    id: '1',
    uuid: 'q1-uuid',
    questionData: {
      type: 'multiple_choice',
      stem: 'What is the capital of France?',
      choices: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 'Paris',
      explanation: 'Paris is the capital and largest city of France.'
    },
    topic: 'Geography',
    category: 'European Capitals',
    subject: 'Geography',
    difficulty: 'easy',
    questionType: 'multiple_choice',
    keywords: ['capital', 'France', 'Europe', 'city'],
    originalQuizId: 'quiz-1',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    uuid: 'q2-uuid',
    questionData: {
      type: 'multiple_choice',
      stem: 'What is the process by which plants make food?',
      choices: ['Respiration', 'Photosynthesis', 'Digestion', 'Transpiration'],
      correctAnswer: 'Photosynthesis',
      explanation: 'Photosynthesis is the process by which plants convert light energy into chemical energy.'
    },
    topic: 'Biology',
    category: 'Plant Biology',
    subject: 'Biology',
    difficulty: 'medium',
    questionType: 'multiple_choice',
    keywords: ['plants', 'photosynthesis', 'food', 'energy'],
    originalQuizId: 'quiz-2',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    uuid: 'q3-uuid',
    questionData: {
      type: 'true_false',
      stem: 'The Earth revolves around the Sun.',
      correctAnswer: true,
      explanation: 'Yes, the Earth orbits the Sun in an elliptical path.'
    },
    topic: 'Science',
    category: 'Astronomy',
    subject: 'Science',
    difficulty: 'easy',
    questionType: 'true_false',
    keywords: ['Earth', 'Sun', 'revolution', 'orbit'],
    originalQuizId: 'quiz-3',
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    uuid: 'q4-uuid',
    questionData: {
      type: 'multiple_choice',
      stem: 'What is the derivative of x²?',
      choices: ['x', '2x', 'x²', '2x²'],
      correctAnswer: '2x',
      explanation: 'The derivative of x² is 2x using the power rule.'
    },
    topic: 'Mathematics',
    category: 'Calculus',
    subject: 'Mathematics',
    difficulty: 'hard',
    questionType: 'multiple_choice',
    keywords: ['derivative', 'calculus', 'power rule', 'x²'],
    originalQuizId: 'quiz-4',
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    uuid: 'q5-uuid',
    questionData: {
      type: 'identification',
      stem: 'Who wrote "Romeo and Juliet"?',
      correctAnswer: 'William Shakespeare',
      explanation: 'William Shakespeare wrote the famous play "Romeo and Juliet".'
    },
    topic: 'Literature',
    category: 'Shakespeare',
    subject: 'English',
    difficulty: 'medium',
    questionType: 'identification',
    keywords: ['Shakespeare', 'Romeo and Juliet', 'play', 'author'],
    originalQuizId: 'quiz-5',
    createdAt: new Date().toISOString()
  }
]

export const questionBankMock = {
  /**
   * Get questions with filters
   */
  async getQuestions(filters = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    let filtered = [...mockQuestions]

    // Apply filters
    if (filters.topic) {
      filtered = filtered.filter(q => q.topic === filters.topic)
    }
    if (filters.category) {
      filtered = filtered.filter(q => q.category === filters.category)
    }
    if (filters.difficulty) {
      const difficulties = Array.isArray(filters.difficulty) ? filters.difficulty : [filters.difficulty]
      filtered = filtered.filter(q => difficulties.includes(q.difficulty))
    }
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type]
      filtered = filtered.filter(q => types.includes(q.questionType))
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(q => 
        q.questionData.stem.toLowerCase().includes(searchLower) ||
        q.topic?.toLowerCase().includes(searchLower) ||
        q.category?.toLowerCase().includes(searchLower) ||
        q.keywords?.some(k => k.toLowerCase().includes(searchLower))
      )
    }

    // Pagination
    const page = filters.page || 1
    const limit = filters.limit || 20
    const start = (page - 1) * limit
    const end = start + limit
    const paginated = filtered.slice(start, end)

    return {
      questions: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      stats: {
        total: mockQuestions.length,
        byDifficulty: {
          easy: mockQuestions.filter(q => q.difficulty === 'easy').length,
          medium: mockQuestions.filter(q => q.difficulty === 'medium').length,
          hard: mockQuestions.filter(q => q.difficulty === 'hard').length
        },
        byType: {
          multiple_choice: mockQuestions.filter(q => q.questionType === 'multiple_choice').length,
          true_false: mockQuestions.filter(q => q.questionType === 'true_false').length,
          identification: mockQuestions.filter(q => q.questionType === 'identification').length
        }
      }
    }
  },

  /**
   * Extract questions (mock)
   */
  async extractQuestions() {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      extracted: mockQuestions.length,
      message: `Successfully extracted ${mockQuestions.length} questions from your quizzes.`
    }
  },

  /**
   * Create custom quiz
   */
  async createCustomQuiz(quizData) {
    await new Promise(resolve => setTimeout(resolve, 800))

    const selectedQuestions = mockQuestions.filter(q => 
      quizData.questionIds.includes(q.id) || quizData.questionIds.includes(q.uuid)
    )

    const quiz = {
      id: `custom-quiz-${Date.now()}`,
      uuid: `custom-${Date.now()}-uuid`,
      title: quizData.title,
      description: quizData.description || '',
      questions: selectedQuestions.map(q => q.questionData),
      questionCount: selectedQuestions.length,
      difficulty: 'custom',
      generatedWithAi: false,
      createdAt: new Date().toISOString()
    }

    return { quiz }
  },

  /**
   * Get statistics
   */
  async getStats() {
    await new Promise(resolve => setTimeout(resolve, 300))

    const topics = [...new Set(mockQuestions.map(q => q.topic))]
    const categories = [...new Set(mockQuestions.map(q => q.category))]

    return {
      stats: {
        total: mockQuestions.length,
        byDifficulty: {
          easy: mockQuestions.filter(q => q.difficulty === 'easy').length,
          medium: mockQuestions.filter(q => q.difficulty === 'medium').length,
          hard: mockQuestions.filter(q => q.difficulty === 'hard').length
        },
        byType: {
          multiple_choice: mockQuestions.filter(q => q.questionType === 'multiple_choice').length,
          true_false: mockQuestions.filter(q => q.questionType === 'true_false').length,
          identification: mockQuestions.filter(q => q.questionType === 'identification').length,
          enumeration: 0
        },
        topics: topics.length,
        categories: categories.length,
        topicsList: topics,
        categoriesList: categories
      }
    }
  }
}


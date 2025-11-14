# Question Bank Feature

A feature-based, modular question bank system that allows users to browse, filter, and select questions from previous quizzes to build custom quizzes.

## Architecture

This feature follows a self-contained, modular structure for easy maintenance and debugging:

```
question-bank/
├── components/          # Reusable UI components
│   ├── QuestionCard.vue
│   ├── QuestionFilters.vue
│   └── SelectedQuestionsPanel.vue
├── pages/              # Route pages
│   ├── QuestionBank.vue
│   └── CustomQuizBuilder.vue
├── services/           # API layer
│   ├── questionBank.api.js
│   └── questionBank.mock.js
├── store/              # State management
│   └── questionBank.store.js
├── index.js            # Feature exports
├── routes.js           # Route definitions
└── README.md           # This file
```

## Features

### Core Functionality
- **Question Extraction**: On-demand extraction of questions from existing quizzes
- **AI Categorization**: Questions are automatically categorized by topic, category, subject, and difficulty
- **Advanced Filtering**: Filter by topic, category, difficulty, question type, and search keywords
- **Question Selection**: Multi-select interface for building custom quizzes
- **Custom Quiz Builder**: Review, reorder, and create custom quizzes from selected questions

### Question Bank Page
- Browse all available questions in a grid layout
- Filter sidebar with multiple filter options
- Search functionality
- Selected questions panel with quick actions
- Pagination support

### Custom Quiz Builder
- Review selected questions
- Reorder questions (move up/down)
- Remove questions
- Add more questions
- Set quiz title and description
- Create and launch custom quiz

## Usage

### Accessing Question Bank

From `UploadQuiz.vue`:
1. Upload a file
2. Select "Generate Quiz"
3. Choose "Custom Quiz" mode
4. Navigate to Question Bank automatically

### Building a Custom Quiz

1. Browse questions in the Question Bank
2. Use filters to narrow down questions
3. Select questions by clicking on question cards
4. Click "Build Quiz" button
5. Review and reorder questions in Custom Quiz Builder
6. Enter quiz title and description
7. Click "Create Quiz" to generate

## State Management

The Pinia store (`questionBank.store.js`) manages:
- Questions list and pagination
- Selected question IDs
- Filter state
- Loading and error states
- Statistics

## API Service

The API service (`questionBank.api.js`) provides:
- `getQuestions(filters)` - Fetch questions with filters
- `extractQuestions()` - Manually trigger extraction
- `createCustomQuiz(quizData)` - Create custom quiz
- `getStats()` - Get question bank statistics

## Mock Service

For development and testing, use `VITE_MOCK_QUESTION_BANK=true` to enable mock data.

## Routes

- `/question-bank` - Browse and select questions
- `/question-bank/build` - Build custom quiz from selections

## Future Enhancements

- Question editing capabilities
- Bulk question operations
- Question tagging system
- Export questions to different formats
- Question difficulty adjustment
- Question sharing between users


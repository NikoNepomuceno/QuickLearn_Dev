# Adaptive Quiz Feature

A feature-based, modular adaptive quiz system that dynamically adjusts question difficulty based on user performance.

## Architecture

This feature follows a self-contained, modular structure for easy maintenance and debugging:

```
adaptive/
├── components/          # Reusable UI components
│   ├── AdaptiveQuestionCard.vue
│   ├── FeedbackBanner.vue
│   ├── ProgressHeader.vue
│   └── ReviewSuggestionModal.vue
├── pages/              # Route pages
│   ├── AdaptiveQuiz.vue
│   └── AdaptiveQuizSummary.vue
├── services/           # API layer
│   ├── adaptive.api.js
│   └── adaptive.mock.js
├── store/              # State management
│   └── adaptiveSession.store.js
├── index.js            # Feature exports
├── routes.js           # Route definitions
├── types.js            # TypeScript/JSDoc types
└── README.md           # This file
```

## Features

### Core Functionality
- **Session-based quiz flow**: Persistent sessions that can be resumed
- **Dynamic difficulty adjustment**: Questions adapt based on performance
- **Review suggestions**: Triggered after 4 consecutive wrong answers
- **Progress tracking**: Real-time stats and accuracy monitoring
- **Pause/Resume**: Continue where you left off

### Difficulty Progression
- Starts at `medium` difficulty
- Steps up after 2 consecutive correct answers
- Steps down after any incorrect answer
- Can be capped at user's preference (via review suggestion)

### Review Suggestions
When a user gets 4 questions wrong in a row:
- **Non-blocking modal** appears with options:
  - Lower difficulty cap
  - See missed topics
  - Continue anyway
- Only shown once per session (with cooldown)

## Usage

### Starting a Session

From `UploadQuiz.vue`:
```javascript
import { adaptiveApi } from '../features/adaptive'

const result = await adaptiveApi.createSession(file, {
  selectedPages: [...],
  customInstructions: '...',
  maxQuestions: 20
})

router.push(`/adaptive/${result.sessionId}`)
```

### Using the Store

```javascript
import { useAdaptiveSessionStore } from '@/features/adaptive'

const store = useAdaptiveSessionStore()

// Start session
await store.startSession(file, options)

// Submit answer
await store.submitAnswer(questionId, answer)

// Load next question
await store.loadNext()

// Finish session
await store.finishSession()
```

## Development

### Mock Mode

For frontend development without a backend, enable mock mode:

```env
VITE_MOCK_ADAPTIVE=true
```

The mock service (`adaptive.mock.js`) simulates:
- Question generation with varying difficulties
- Answer validation
- Stats tracking
- Review suggestion triggering
- Session persistence

### API Contracts

#### POST `/api/adaptive/sessions`
Creates a new session
- **Request**: `multipart/form-data` with `file` + options
- **Response**: `{ sessionId, question }`

#### POST `/api/adaptive/sessions/:id/answers`
Submits an answer
- **Request**: `{ questionId, answer }`
- **Response**: `{ correct, explanation?, updatedStats, reviewSuggestion?, nextQuestion? }`

#### GET `/api/adaptive/sessions/:id`
Gets session snapshot
- **Response**: `{ status, stats, pendingQuestion?, ... }`

#### GET `/api/adaptive/sessions/:id/next`
Gets next question
- **Response**: `{ question }`

#### POST `/api/adaptive/sessions/:id/preferences`
Sets preferences (e.g., difficulty cap)
- **Request**: `{ difficultyCap?: 'easy'|'medium' }`
- **Response**: `{ preferences }`

#### POST `/api/adaptive/sessions/:id/finish`
Finishes session
- **Response**: `{ summary: { asked, correct, trajectory, ... } }`

## State Flow

```
1. User uploads file → selects "Adaptive" mode
2. System creates session → returns first question
3. User answers → system validates → updates stats → determines next difficulty
4. If wrong streak ≥ 4 → show review suggestion
5. Repeat until max questions or user finishes
6. Show summary with stats and trajectory
```

## Components

### `ProgressHeader`
Displays:
- Questions answered / total
- Accuracy percentage
- Current difficulty badge
- Wrong streak indicator (if ≥ 2)

### `AdaptiveQuestionCard`
Renders:
- Question stem and topic
- Multiple choice or text input
- Submit button with validation

### `FeedbackBanner`
Shows:
- Correct/incorrect indicator
- Explanation
- Auto-dismisses after 3s

### `ReviewSuggestionModal`
Offers:
- Lower difficulty cap
- See missed topics
- Continue anyway

## Testing

The mock service provides consistent, testable data:
- Predictable question generation
- Deterministic answer validation
- Wrong streak triggers after exactly 4 incorrect answers
- Session state persistence in memory

Run the app with `VITE_MOCK_ADAPTIVE=true` to test the full flow without a backend.

## Future Enhancements

- Topic-based difficulty adjustment
- Spaced repetition scheduling
- Multi-session progress tracking
- Collaborative sessions
- Export quiz results as PDF

## Phase 2: Backend Implementation

See `adaptive.plan.md` in the project root for backend implementation details (models, routes, services).


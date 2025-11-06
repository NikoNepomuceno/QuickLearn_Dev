# Adaptive Quiz - Quick Start Guide

## Installation & Setup

### 1. Environment Configuration

Create a `.env` file in `QuickLearn-Frontend/`:

```env
# Enable mock mode for frontend-only testing
VITE_MOCK_ADAPTIVE=true

# API base URL (used when mock mode is disabled)
VITE_API_BASE=http://localhost:3000
```

### 2. Install Dependencies

```bash
cd QuickLearn-Frontend
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Testing the Adaptive Quiz

### Step-by-Step Flow

1. **Login/Register**
   - Navigate to the app
   - Login or create an account

2. **Upload a File**
   - Go to the Upload page
   - Drag & drop or select a PDF, DOCX, PPTX, or TXT file
   - Wait for parsing to complete

3. **Choose Generation Type**
   - Select "Generate Quiz"

4. **Select Quiz Mode**
   - Choose "Adaptive Learning" (the one with dynamic difficulty)

5. **Select Pages** (optional)
   - Choose specific pages or use all pages
   - Click "Continue"

6. **Start Session**
   - Session is created
   - You're navigated to `/adaptive/:sessionId`
   - First question appears

7. **Answer Questions**
   - Read the question
   - Select your answer (multiple choice) or type it (text input)
   - Click "Submit Answer"
   - Feedback banner shows if you're correct/incorrect
   - Next question automatically loads

8. **Trigger Review Suggestion** (Optional)
   - Answer 4 questions incorrectly in a row
   - Review suggestion modal appears with options:
     - **Lower difficulty cap**: Limits questions to easier levels
     - **See missed topics**: Shows what you've struggled with
     - **Continue anyway**: Dismiss and keep going

9. **Complete or Pause**
   - **Complete**: Answer all questions or click "Finish"
   - **Pause**: Click "Pause" to save progress
   - **Resume**: Return later, and your session will be available

10. **View Summary**
    - After completion, see:
      - Your accuracy percentage
      - Performance level
      - Question breakdown
      - Difficulty trajectory
      - Time spent
      - Max wrong streak
    - Actions available:
      - Take another quiz
      - Share results
      - Go home

## Key Features to Test

### ✓ Difficulty Progression

- Start with medium questions
- Answer 2 correctly in a row → difficulty increases
- Answer 1 incorrectly → difficulty decreases
- Verify difficulty badge updates in the progress header

### ✓ Review Suggestion

- Get 4 questions wrong consecutively
- Modal should appear after the 4th wrong answer
- Try each option:
  - Lower cap → verify next questions are easier
  - See topics → panel shows missed topics
  - Continue → modal closes, no changes

### ✓ Pause & Resume

- Start a session
- Click "Pause"
- Close the browser or navigate away
- Return to the Upload page
- Check localStorage for `adaptiveSessionId`
- Navigate to `/adaptive/:sessionId` (use the saved ID)
- Session resumes from where you left off

### ✓ Session Completion

- Answer all questions
- Automatic redirect to summary page
- Summary displays all stats correctly

### ✓ Progress Tracking

- Watch the progress bar fill up
- Verify accuracy percentage updates
- Check wrong streak indicator (appears after 2+ wrong)

## Mock Service Behavior

The mock service (`adaptive.mock.js`) provides:

- **Consistent questions**: 3 questions per difficulty level, rotating
- **Realistic delays**: 200-800ms to simulate network requests
- **Deterministic answers**: Each question has a fixed correct answer
- **Memory persistence**: Sessions stored in-memory during development

### Sample Questions

**Easy:**

- What is the capital of France? (Answer: Paris)
- What is 2 + 2? (Answer: 4)
- What color is the sky on a clear day? (Answer: Blue)

**Medium:**

- Which planet is known as the Red Planet? (Answer: Mars)
- Who wrote "Romeo and Juliet"? (Answer: William Shakespeare)
- What is the square root of 144? (Answer: 12)

**Hard:**

- What is the speed of light in vacuum (m/s)? (Answer: 299,792,458)
- Who developed the theory of general relativity? (Answer: Albert Einstein)
- What is the derivative of x² with respect to x? (Answer: 2x)

## Troubleshooting

### Session Not Found

- Check that `VITE_MOCK_ADAPTIVE=true` is set in `.env`
- Clear localStorage and start a new session
- Verify the sessionId in the URL matches localStorage

### Questions Not Loading

- Check browser console for errors
- Verify mock service is enabled
- Restart dev server after changing `.env`

### Review Modal Not Appearing

- Ensure you've answered 4 questions incorrectly **in a row**
- Modal only shows once per session
- Check console for `reviewSuggestionShownAt` timestamp

### Difficulty Not Changing

- Answer 2 questions correctly in a row for step-up
- Answer 1 incorrectly for step-down
- Check the difficulty badge in the progress header

## Switching to Real Backend

When Phase 2 (backend) is complete:

1. Update `.env`:

   ```env
   VITE_MOCK_ADAPTIVE=false
   VITE_API_BASE=http://localhost:3000
   ```

2. Ensure backend is running

3. Restart the dev server

4. API calls will now go to the real backend instead of mocks

No code changes needed! The API contracts match exactly.

## Development Tips

### Inspect Store State

Open Vue DevTools → Pinia → `adaptiveSession`:

- View current question
- Check stats
- See review suggestion state
- Monitor loading states

### Test Edge Cases

- Start session with no pages selected
- Submit empty text answer
- Pause immediately after starting
- Complete session with 0 correct answers
- Network errors (disable mock, don't run backend)

### Component Isolation

Each component is self-contained and can be tested independently:

- `AdaptiveQuestionCard` - Question rendering
- `ProgressHeader` - Stats display
- `FeedbackBanner` - Feedback animation
- `ReviewSuggestionModal` - Review UI

## Next Steps

Once comfortable with the frontend:

1. Review the API contracts in `src/features/adaptive/README.md`
2. Implement Phase 2 (Backend) following `adaptive.plan.md`
3. Switch to real backend and test end-to-end
4. Deploy to production

## Support

For issues or questions:

- Check `src/features/adaptive/README.md` for detailed docs
- Review `ADAPTIVE_IMPLEMENTATION.md` for implementation details
- Inspect browser console for errors
- Use Vue DevTools to debug component state

---

**Happy Testing!** 🚀

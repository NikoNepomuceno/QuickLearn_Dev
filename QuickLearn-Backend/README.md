# QuickLearn Backend

ExpressJS backend to upload a file, extract text, and generate a quiz.

## Features
- Upload `.txt`, `.pdf`, `.docx`
- Extract text from uploaded file (memory storage)
- Generate simple MCQ quiz frm text

## Requirements
- Node.js 18+

## Install
```bash
npm install
```

## Run
```bash
npm start
```

Then visit `http://localhost:3000/health` to check status.

## API
### POST `/api/quiz/from-file`
- Content-Type: `multipart/form-data`
- Field: `file` (single file)
- Optional query: `count` (default 5, max 10)

#### Curl example
```bash
curl -X POST "http://localhost:3000/api/quiz/from-file?count=5" \
  -H "Accept: application/json" \
  -F "file=@/path/to/your/file.pdf"
```

#### Response
```json
{
  "quiz": {
    "title": "Generated Quiz",
    "description": "Quiz auto-generated from uploaded content",
    "questions": [
      {
        "question": "... _____ ...",
        "choices": ["...", "...", "...", "..."],
        "answer": "...",
        "explanation": "...",
        "type": "mcq"
      }
    ]
  }
}
```

## Notes
- Max upload size: 10MB
- Supported types: `.txt`, `.pdf`, `.docx`
- The quiz generation is heuristic and not semantic.

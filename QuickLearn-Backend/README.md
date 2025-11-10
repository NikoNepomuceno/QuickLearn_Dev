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

## Performance flags (set in your .env)
```
ENABLE_GLOBAL_RATELIMIT=1
ENABLE_LB_CACHE=1
ENABLE_WS_DEFLATE=1
ENABLE_RESPONSE_TIME=0
MYSQL_POOL_LIMIT=20
DEBUG_AI=0
```

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

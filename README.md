# QuickLearn

**Transform Your Learning Experience with AI-Powered Study Tools**

QuickLearn is a comprehensive learning platform that helps students and educators instantly convert uploaded files into interactive quizzes, flashcards, and personalized study materials. With support for multiple file formats and AI-powered content analysis, QuickLearn makes studying faster, smarter, and more engaging.

## 🚀 What is QuickLearn?

QuickLearn is a full-stack web application that transforms educational content into interactive study materials. Whether you're a student preparing for exams or an educator creating assessments, QuickLearn streamlines the process of creating effective study tools.

### Key Features

- **📄 Multi-Format Support**: Upload PDF, Word documents, and text files
- **🤖 AI-Powered Analysis**: Advanced AI understands your content and creates relevant study materials
- **📊 Progress Tracking**: Detailed analytics and insights into your learning progress
- **☁️ Cloud Storage**: Secure cloud-based storage with Cloudinary integration
- **🔐 User Authentication**: Secure JWT-based authentication system
- **📧 Email Verification**: Complete email verification and password reset functionality

### Supported Question Types

- **Multiple Choice Questions (MCQ)**
- **True/False Questions**
- **Identification Questions**
- **Enumeration Questions**
- **Mixed Format Quizzes**

## 🏗️ Architecture

QuickLearn follows a modern full-stack architecture:

- **Frontend**: Vue.js 3 with Vite, Pinia for state management, Vue Router
- **Backend**: Node.js with Express.js, MySQL database, JWT authentication
- **Cloud Storage**: Cloudinary for file storage and optimization
- **AI Integration**: OpenAI API for intelligent content analysis
- **Email Service**: Nodemailer for email verification and notifications

## 📋 Prerequisites

Before setting up QuickLearn, ensure you have the following installed on your system:

### Required Software

1. **Node.js** (v18 or higher)

   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **MySQL Database** (v8.0 or higher)

   - Download from [mysql.com](https://dev.mysql.com/downloads/)
   - Alternative: Use XAMPP, WAMP, or MAMP for easy setup
   - Verify installation: `mysql --version`

3. **Git** (for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/)

### Required Accounts & API Keys

You'll need to create accounts and obtain API keys for the following services:

1. **Cloudinary Account** (for file storage)

   - Sign up at [cloudinary.com](https://cloudinary.com/)
   - Get your Cloud Name, API Key, and API Secret

2. **OpenAI Account** (for AI-powered quiz generation)

   - Sign up at [platform.openai.com](https://platform.openai.com/)
   - Get your API key from the API section

3. **Email Service** (for user verification)
   - Gmail SMTP (recommended for development)
   - Or any SMTP service (SendGrid, Mailgun, etc.)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd QuickLearn
```

### 2. Database Setup

1. **Create MySQL Database**:

   ```sql
   CREATE DATABASE quicklearn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Import Database Schema**:

   ```bash
   # Using MySQL command line
   mysql -u root -p quicklearn < QuickLearn-Backend/db/schema.sql

   # Or using phpMyAdmin
   # Import the file: QuickLearn-Backend/db/schema.sql
   ```

### 3. Backend Setup

1. **Navigate to Backend Directory**:

   ```bash
   cd QuickLearn-Backend
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Create Environment File**:
   Create a `.env` file in the `QuickLearn-Backend` directory with the following variables:

   ```env
   # Database Configuration
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=quicklearn

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Email Configuration (Gmail SMTP example)
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_app_password
   MAIL_FROM_ADDRESS=your_email@gmail.com
   MAIL_FROM_NAME=QuickLearn

   # Application Configuration
   PORT=3000
   FRONTEND_URL=http://localhost:5173
   APP_NAME=QuickLearn
   DOMAIN=localhost
   ```

### 4. Frontend Setup

1. **Navigate to Frontend Directory**:

   ```bash
   cd ../QuickLearn-Frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

## 🚀 Running the Application

### Option 1: Run Both Services Simultaneously (Recommended)

From the root directory:

```bash
npm run dev
```

This will start both the backend (port 3000) and frontend (port 5173) simultaneously.

### Option 2: Run Services Separately

**Backend (Terminal 1)**:

```bash
cd QuickLearn-Backend
npm run dev
```

**Frontend (Terminal 2)**:

```bash
cd QuickLearn-Frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📁 Project Structure

```
QuickLearn/
├── QuickLearn-Backend/          # Backend API
│   ├── src/
│   │   ├── config/             # Database, Cloudinary, Email configs
│   │   ├── middleware/         # Authentication, Rate limiting
│   │   ├── models/             # Database models
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic services
│   │   └── utils/              # Utility functions
│   ├── db/
│   │   └── schema.sql          # Database schema
│   └── package.json
├── QuickLearn-Frontend/         # Vue.js Frontend
│   ├── src/
│   │   ├── components/         # Vue components
│   │   ├── views/              # Page components
│   │   ├── services/           # API services
│   │   ├── stores/            # Pinia state management
│   │   └── router/            # Vue Router configuration
│   └── package.json
├── FlowCharts/                 # Architecture diagrams
└── README.md
```

## 🔧 Development

### Available Scripts

**Backend**:

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

**Frontend**:

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

### API Endpoints

**Authentication**:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

**Quiz Management**:

- `POST /api/quiz/from-file` - Generate quiz from uploaded file
- `GET /api/quiz/user-quizzes` - Get user's quizzes
- `GET /api/quiz/:id` - Get specific quiz
- `POST /api/quiz/:id/attempt` - Submit quiz attempt

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**:

   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Cloudinary Upload Fails**:

   - Verify Cloudinary credentials
   - Check file size limits (max 10MB)

3. **Email Not Sending**:

   - Verify SMTP credentials
   - For Gmail, use App Passwords instead of regular password
   - Check firewall settings

4. **Frontend Not Loading**:
   - Ensure backend is running on port 3000
   - Check for CORS issues
   - Verify API endpoints are accessible

### Getting Help

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that all required services (MySQL, Cloudinary, OpenAI) are accessible

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Happy Learning with QuickLearn! 🎓✨**

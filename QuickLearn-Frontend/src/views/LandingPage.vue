<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import PrivacyPolicyModal from '../components/PrivacyPolicyModal.vue'

const router = useRouter()
const isMenuOpen = ref(false)
const showPrivacy = ref(false)

const navigateToUpload = () => {
  router.push('/upload')
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// function goLogin() { router.push('/login') }
function goRegister() {
  router.push({ path: '/register', query: { pp: '1' } })
}
function onAcceptPrivacy() {}

// Pricing plan selection
function selectPlan(tier) {
  if (tier === 'free') {
    goRegister()
  } else {
    window.$toast?.info('Coming soon! Premium features will be available shortly.')
  }
}

// Smooth scroll to section
function smoothScrollTo(event, sectionId) {
  event.preventDefault()
  const element = document.querySelector(sectionId)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    // Close mobile menu after navigation
    isMenuOpen.value = false
  }
}
</script>

<template>
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-logo">
          <img src="/img/QuickLearn-Logo.png" alt="QuickLearn Logo" class="nav-logo-img" />
          <h2>QuickLearn</h2>
        </div>
        <div class="nav-menu" :class="{ active: isMenuOpen }">
          <a href="#features" class="nav-link" @click="smoothScrollTo($event, '#features')">Features</a>
          <a href="#how-it-works" class="nav-link" @click="smoothScrollTo($event, '#how-it-works')">How it Works</a>
          <a href="#pricing" class="nav-link" @click="smoothScrollTo($event, '#pricing')">Pricing</a>
          <a href="#testimonials" class="nav-link" @click="smoothScrollTo($event, '#testimonials')">Testimonials</a>
          <!-- <button class="nav-ghost" @click="goLogin">Log in</button> -->
          <button class="nav-cta" @click="goRegister">Get Started</button>
        </div>
        <div class="nav-toggle" @click="toggleMenu">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">
            Transform Your Learning Experience with
            <span class="gradient-text">QuickLearn</span>
          </h1>
          <p class="hero-subtitle">
            Create accurate study materials from your course content in seconds. Upload any document
            and get instant quizzes, flashcards, and personalized study tools powered by AI.
          </p>
          <div class="hero-actions">
            <button class="btn-primary btn-with-sparkle" @click="goRegister">
              Try For Free
              <div class="sparkle-animation">
                <DotLottieVue
                  style="height: 50px; width: 50px"
                  autoplay
                  loop
                  src="https://lottie.host/36b984e4-9248-4ae1-9a72-ed5dd82e2c3d/du0n3KDTec.lottie"
                />
              </div>
            </button>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-number">92%</span>
              <span class="stat-label">Improved Grades</span>
            </div>
            <div class="stat">
              <span class="stat-number">30%</span>
              <span class="stat-label">Less Study Time</span>
            </div>
            <div class="stat">
              <span class="stat-number">10K+</span>
              <span class="stat-label">Students Helped</span>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="demo-card">
            <div class="demo-header">
              <div class="demo-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="demo-title">QuickLearn Demo</span>
            </div>
            <div class="demo-content">
              <div class="upload-area">
                <div class="upload-icon">📄</div>
                <p>Upload your document</p>
                <span class="file-types">PDF, DOCX, PPTX, TXT</span>
              </div>
              <div class="processing">
                <div class="spinner"></div>
                <p>AI is analyzing your content...</p>
              </div>
              <div class="results">
                <div class="result-item">
                  <span class="result-icon">❓</span>
                  <span>5 Quiz Questions</span>
                </div>
                <div class="result-item">
                  <span class="result-icon">🃏</span>
                  <span>10 Flashcards</span>
                </div>
                <div class="result-item">
                  <span class="result-icon">📝</span>
                  <span>Summary Notes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="container">
        <div class="section-header">
          <h2>Everything you need to study smarter</h2>
          <p>QuickLearn transforms any document into comprehensive study materials</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3>Instant Study Sets</h3>
            <p>
              Convert your notes, videos, and presentations into flashcards, quizzes, and
              personalized chat assistance with a single click.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🤖</div>
            <h3>AI-Powered Analysis</h3>
            <p>
              Our advanced AI understands your content and creates relevant, accurate study
              materials tailored to your learning needs.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>Progress Tracking</h3>
            <p>
              Track your learning progress with detailed analytics and insights into your strengths
              and areas for improvement.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>Personalized Learning</h3>
            <p>
              Get study recommendations and adaptive quizzes that adjust to your learning pace and
              style.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📚</div>
            <h3>Multiple Formats</h3>
            <p>
              Support for PDF, Word documents, and text files. Upload any educational content and
              get instant results.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⏱️</div>
            <h3>Save Time</h3>
            <p>
              Reduce study time by 30% with our efficient learning tools and smart content
              organization.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="how-it-works">
      <div class="container">
        <div class="section-header">
          <h2>How QuickLearn Works</h2>
          <p>Get started in three simple steps</p>
        </div>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Upload Your Content</h3>
              <p>Upload any PDF, Word document, or text file containing your study material.</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>AI Analysis</h3>
              <p>
                Our AI analyzes your content and identifies key concepts, facts, and learning
                objectives.
              </p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Study & Learn</h3>
              <p>
                Get instant access to quizzes, flashcards, and summaries tailored to your content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Plans and Pricing Section -->
    <section id="pricing" class="pricing">
      <div class="container">
        <div class="section-header">
          <h2>Choose Your Learning Plan</h2>
          <p>Start free and upgrade as you grow</p>
        </div>
        <div class="pricing-grid">
          <!-- Free Tier -->
          <div class="pricing-card">
            <div class="pricing-header">
              <h3>Free</h3>
              <div class="price">
                <span class="currency">$</span>
                <span class="amount">0</span>
                <span class="period">/month</span>
              </div>
              <p class="pricing-subtitle">Perfect for trying out QuickLearn</p>
            </div>
            <ul class="features-list">
              <li><span class="check">✓</span> Max 10 quizzes/month</li>
              <li><span class="check">✓</span> Up to 20 questions per quiz</li>
              <li><span class="check">✓</span> Up to 2 question types per quiz</li>
              <li><span class="check">✓</span> Up to 10 AI summaries/month</li>
              <li><span class="check">✓</span> Basic AI analysis</li>
              <li><span class="check">✓</span> Standard processing speed</li>
            </ul>
            <button class="pricing-btn" @click="$router.push('/login')">Get Started Free</button>
          </div>

          <!-- Pro Tier -->
          <div class="pricing-card featured">
            <div class="badge">Most Popular</div>
            <div class="pricing-header">
              <h3>Pro</h3>
              <div class="price">
                <span class="currency">$</span>
                <span class="amount">9.99</span>
                <span class="period">/month</span>
              </div>
              <p class="pricing-subtitle">For serious students</p>
            </div>
            <ul class="features-list">
              <li><span class="check">✓</span> 100 quizzes/month</li>
              <li><span class="check">✓</span> Up to 50 questions per quiz</li>
              <li><span class="check">✓</span> Unlimited question types (Mixed allowed)</li>
              <li><span class="check">✓</span> Up to 50 AI summaries/month</li>
              <li><span class="check">✓</span> Advanced AI options</li>
              <li><span class="check">✓</span> Faster processing</li>
              <li><span class="check">✓</span> Page selection & flashcards</li>
              <li><span class="check">✓</span> Progress tracking</li>
              <li><span class="check">✓</span> Brand-free exports</li>
            </ul>
            <button class="pricing-btn primary" @click="selectPlan('pro')">Choose Pro</button>
          </div>

          <!-- Premium Tier -->
          <div class="pricing-card">
            <div class="pricing-header">
              <h3>Premium</h3>
              <div class="price">
                <span class="currency">$</span>
                <span class="amount">19.99</span>
                <span class="period">/month</span>
              </div>
              <p class="pricing-subtitle">Ultimate learning power</p>
            </div>
            <ul class="features-list">
              <li><span class="check">✓</span> Unlimited quizzes</li>
              <li><span class="check">✓</span> Up to 50 questions per quiz</li>
              <li><span class="check">✓</span> All advanced AI controls</li>
              <li><span class="check">✓</span> Unlimited summaries & flashcards</li>
              <li><span class="check">✓</span> Priority processing</li>
              <li><span class="check">✓</span> Advanced analytics</li>
              <li><span class="check">✓</span> AI study assistant/chat</li>
              <li><span class="check">✓</span> Priority support</li>
            </ul>
            <button class="pricing-btn" @click="selectPlan('premium')">Choose Premium</button>
          </div>
        </div>
        <div class="pricing-footer">
          <p>All plans include secure cloud storage and email support</p>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section id="testimonials" class="testimonials">
      <div class="container">
        <div class="section-header">
          <h2>What Students Are Saying</h2>
          <p>Join thousands of students who are studying smarter with QuickLearn</p>
        </div>
        <div class="testimonials-grid">
          <div class="testimonial">
            <div class="testimonial-content">
              <p>
                "QuickLearn saved me hours of study time. I uploaded my textbook chapters and got
                perfect quiz questions in seconds!"
              </p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar">👩‍🎓</div>
              <div class="author-info">
                <h4>Sarah Chen</h4>
                <span>Computer Science Student</span>
              </div>
            </div>
          </div>
          <div class="testimonial">
            <div class="testimonial-content">
              <p>
                "The AI-generated flashcards are incredibly accurate. My test scores improved by 20
                points this semester!"
              </p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar">👨‍🎓</div>
              <div class="author-info">
                <h4>Marcus Johnson</h4>
                <span>Biology Major</span>
              </div>
            </div>
          </div>
          <div class="testimonial">
            <div class="testimonial-content">
              <p>
                "Finally, a tool that actually understands my course material. The summaries are
                spot-on and the quizzes are challenging but fair."
              </p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar">👩‍🎓</div>
              <div class="author-info">
                <h4>Emily Rodriguez</h4>
                <span>History Student</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <div class="cta-content">
          <h2>Ready to Transform Your Learning?</h2>
          <p>Join thousands of students who are already studying smarter with QuickLearn</p>
          <button class="btn-primary large" @click="navigateToUpload">Start Learning Now</button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h3>QuickLearn</h3>
            <p>Transform your learning experience with AI-powered study tools.</p>
          </div>
          <div class="footer-section">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How it Works</a></li>
              <li><a href="/upload">Get Started</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2024 QuickLearn. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
  <PrivacyPolicyModal v-model="showPrivacy" @accept="onAcceptPrivacy" />
</template>

<style scoped>
/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Smooth scroll for the entire page */
html {
  scroll-behavior: smooth;
}

.landing-page {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
}

/* Dark mode landing page */
body.dark .landing-page {
  color: #e5e7eb;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Navigation */
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
}

/* Dark mode navigation */
body.dark .navbar {
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(31, 42, 68, 0.3);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-logo h2 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.nav-logo-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 30px;
}

.nav-link {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #667eea;
}

/* Dark mode navigation links */
body.dark .nav-link {
  color: #e5e7eb;
}

body.dark .nav-link:hover {
  color: #a5b4fc;
}

.nav-cta {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.nav-cta:hover {
  transform: translateY(-2px);
}

.nav-toggle {
  display: none;
  flex-direction: column;
  cursor: pointer;
}

.bar {
  width: 25px;
  height: 3px;
  background: #333;
  margin: 3px 0;
  transition: 0.3s;
}

/* Dark mode hamburger menu */
body.dark .bar {
  background: #e5e7eb;
}

/* Hero Section */
.hero {
  padding: 120px 0 80px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
}

/* Dark mode hero */
body.dark .hero {
  background: linear-gradient(135deg, #0b1222 0%, #1f2a44 100%);
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  gap: 60px;
  align-items: center;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 24px;
  color: #2d3748;
}

/* Dark mode hero title */
body.dark .hero-title {
  color: #e5e7eb;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #4a5568;
  margin-bottom: 32px;
  line-height: 1.6;
}

/* Dark mode hero subtitle */
body.dark .hero-subtitle {
  color: #9ca3af;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
}

.btn-primary.large {
  padding: 20px 40px;
  font-size: 1.2rem;
}

/* Button with sparkle animation */
.btn-with-sparkle {
  position: relative;
  overflow: visible;
}

.sparkle-animation {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 40px;
  height: 40px;
  pointer-events: none;
  z-index: 10;
  animation: pulse-sparkle 2s ease-in-out infinite;
}

@keyframes pulse-sparkle {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.btn-secondary {
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
  padding: 14px 30px;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
}

.hero-stats {
  display: flex;
  gap: 40px;
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  color: #667eea;
}

.stat-label {
  font-size: 0.9rem;
  color: #4a5568;
  font-weight: 500;
}

/* Dark mode stats */
body.dark .stat-label {
  color: #9ca3af;
}

/* Hero Visual */
.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.demo-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  max-width: 400px;
  animation: float 6s ease-in-out infinite;
}

/* Dark mode demo card */
body.dark .demo-card {
  background: #0f172a;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.demo-header {
  width: 400px;
  background: #f8f9fa;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e9ecef;
}

/* Dark mode demo header */
body.dark .demo-header {
  background: #1f2a44;
  border-bottom: 1px solid #334155;
}

.demo-dots {
  display: flex;
  gap: 6px;
}

.demo-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #dee2e6;
}

.demo-dots span:first-child {
  background: #ff5f57;
}

.demo-dots span:nth-child(2) {
  background: #ffbd2e;
}

.demo-dots span:last-child {
  background: #28ca42;
}

.demo-title {
  font-weight: 600;
  color: #495057;
}

/* Dark mode demo title */
body.dark .demo-title {
  color: #e5e7eb;
}

.demo-content {
  padding: 30px 20px;
}

.upload-area {
  text-align: center;
  padding: 20px;
  border: 2px dashed #dee2e6;
  border-radius: 12px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

/* Dark mode upload area */
body.dark .upload-area {
  border-color: #334155;
  background: transparent;
}

body.dark .upload-area:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.upload-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.upload-area p {
  font-weight: 600;
  margin-bottom: 4px;
}

.file-types {
  font-size: 0.9rem;
  color: #6c757d;
}

/* Dark mode upload area text */
body.dark .upload-area p {
  color: #e5e7eb;
}

body.dark .file-types {
  color: #9ca3af;
}

.processing {
  text-align: center;
  padding: 20px;
  background: #f8f9ff;
  border-radius: 12px;
  margin-bottom: 20px;
}

/* Dark mode processing */
body.dark .processing {
  background: rgba(102, 126, 234, 0.1);
}

body.dark .processing p {
  color: #e5e7eb;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-weight: 500;
}

/* Dark mode result items */
body.dark .result-item {
  background: #1f2a44;
  color: #e5e7eb;
}

.result-icon {
  font-size: 1.2rem;
}

/* Features Section */
.features {
  padding: 100px 0;
  background: white;
}

/* Dark mode features */
body.dark .features {
  background: #0b1222;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-header h2 {
  font-size: 2.5rem;
  font-weight: 800;
  color: #2d3748;
  margin-bottom: 16px;
}

.section-header p {
  font-size: 1.2rem;
  color: #4a5568;
}

/* Dark mode section headers */
body.dark .section-header h2 {
  color: #e5e7eb;
}

body.dark .section-header p {
  color: #9ca3af;
}

.features-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
}

.feature-card {
  text-align: center;
  padding: 40px 30px;
  border-radius: 20px;
  background: #f8f9ff;
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
  flex: 1 1 350px;
  min-width: 350px;
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.1);
  background: white;
}

/* Dark mode feature cards */
body.dark .feature-card {
  background: #0f172a;
  border: 1px solid #1f2a44;
}

body.dark .feature-card:hover {
  background: #1f2a44;
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 16px;
}

.feature-card p {
  color: #4a5568;
  line-height: 1.6;
}

/* Dark mode feature card text */
body.dark .feature-card h3 {
  color: #e5e7eb;
}

body.dark .feature-card p {
  color: #9ca3af;
}

/* How It Works Section */
.how-it-works {
  padding: 100px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.how-it-works .section-header h2,
.how-it-works .section-header p {
  color: white;
}

.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-top: 60px;
}

.step {
  text-align: center;
  padding: 40px 20px;
  flex: 1 1 300px;
  min-width: 300px;
}

.step-number {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 800;
  margin: 0 auto 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.step h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 16px;
}

.step p {
  font-size: 1.1rem;
  opacity: 0.9;
  line-height: 1.6;
}

/* Pricing Section */
.pricing {
  padding: 100px 0;
  background: white;
}

body.dark .pricing {
  background: #0f172a;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
  margin-top: 60px;
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
}

.pricing-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 20px;
  padding: 40px 30px;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  flex-direction: column;
}

body.dark .pricing-card {
  background: #0b1222;
  border-color: #1f2a44;
}

.pricing-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.15);
  border-color: #667eea;
}

body.dark .pricing-card:hover {
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.25);
}

.pricing-card.featured {
  border-color: #667eea;
  border-width: 3px;
  transform: scale(1.05);
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
}

body.dark .pricing-card.featured {
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
}

.pricing-card.featured:hover {
  transform: scale(1.08) translateY(-5px);
}

.badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.pricing-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 2px solid #f1f3f5;
}

body.dark .pricing-header {
  border-bottom-color: #1f2a44;
}

.pricing-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 20px;
}

body.dark .pricing-header h3 {
  color: #e5e7eb;
}

.price {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 12px;
}

.currency {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  margin-top: 10px;
}

.amount {
  font-size: 3.5rem;
  font-weight: 800;
  color: #2d3748;
  line-height: 1;
}

body.dark .amount {
  color: #e5e7eb;
}

.period {
  font-size: 1rem;
  color: #6c757d;
  margin-top: 20px;
  margin-left: 4px;
}

body.dark .period {
  color: #9ca3af;
}

.pricing-subtitle {
  color: #6c757d;
  font-size: 0.95rem;
}

body.dark .pricing-subtitle {
  color: #9ca3af;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 30px 0;
  flex-grow: 1;
}

.features-list li {
  padding: 12px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #4a5568;
  font-size: 0.95rem;
  line-height: 1.5;
}

body.dark .features-list li {
  color: #9ca3af;
}

.check {
  color: #28ca42;
  font-weight: 700;
  font-size: 1.2rem;
  min-width: 20px;
}

.pricing-btn {
  width: 100%;
  padding: 16px 32px;
  border: 2px solid #667eea;
  background: transparent;
  color: #667eea;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: auto;
}

.pricing-btn:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.pricing-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.pricing-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.5);
}

.pricing-footer {
  text-align: center;
  margin-top: 40px;
  padding-top: 40px;
  border-top: 1px solid #e9ecef;
}

body.dark .pricing-footer {
  border-top-color: #1f2a44;
}

.pricing-footer p {
  color: #6c757d;
  font-size: 0.9rem;
}

body.dark .pricing-footer p {
  color: #9ca3af;
}

/* Testimonials Section */
.testimonials {
  padding: 100px 0;
  background: #f8f9fa;
}

/* Dark mode testimonials */
body.dark .testimonials {
  background: #0f172a;
}

.testimonials-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-top: 60px;
}

.testimonial {
  background: white;
  padding: 40px 30px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  flex: 1 1 350px;
  min-width: 350px;
}

.testimonial:hover {
  transform: translateY(-5px);
}

/* Dark mode testimonials */
body.dark .testimonial {
  background: #1f2a44;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.testimonial-content {
  margin-bottom: 24px;
}

.testimonial-content p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #4a5568;
  font-style: italic;
}

/* Dark mode testimonial content */
body.dark .testimonial-content p {
  color: #9ca3af;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 16px;
}

.author-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.author-info h4 {
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 4px;
}

.author-info span {
  color: #4a5568;
  font-size: 0.9rem;
}

/* Dark mode author info */
body.dark .author-info h4 {
  color: #e5e7eb;
}

body.dark .author-info span {
  color: #9ca3af;
}

/* CTA Section */
.cta {
  padding: 100px 0;
  background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  color: white;
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 16px;
}

.cta-content p {
  font-size: 1.2rem;
  margin-bottom: 32px;
  opacity: 0.9;
}

/* Footer */
.footer {
  background: #1a202c;
  color: white;
  padding: 60px 0 20px;
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-bottom: 40px;
}

.footer-section h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-section h4 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.footer-section p {
  color: #a0aec0;
  line-height: 1.6;
}

.footer-section ul {
  list-style: none;
}

.footer-section ul li {
  margin-bottom: 8px;
}

.footer-section ul li a {
  color: #a0aec0;
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-section ul li a:hover {
  color: #667eea;
}

.footer-bottom {
  border-top: 1px solid #2d3748;
  padding-top: 20px;
  text-align: center;
  color: #a0aec0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .nav-menu {
    position: fixed;
    left: -100%;
    top: 70px;
    flex-direction: column;
    background-color: white;
    width: 100%;
    text-align: center;
    transition: 0.3s;
    box-shadow: 0 10px 27px rgba(0, 0, 0, 0.05);
    padding: 20px 0;
  }

  /* Dark mode mobile menu */
  body.dark .nav-menu {
    background-color: #0f172a;
    box-shadow: 0 10px 27px rgba(0, 0, 0, 0.3);
  }

  .nav-menu.active {
    left: 0;
  }

  .nav-toggle {
    display: flex;
  }

  .hero-container {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .hero-stats {
    justify-content: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .steps {
    grid-template-columns: 1fr;
  }

  .pricing {
    padding: 60px 0;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .pricing-card.featured {
    transform: scale(1);
  }

  .pricing-card.featured:hover {
    transform: translateY(-5px);
  }

  .testimonials-grid {
    grid-template-columns: 1fr;
  }

  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 12px;
  }

  .nav-container {
    padding: 0 12px;
    height: 60px;
  }

  .nav-logo h2 {
    font-size: 20px;
  }

  .hero {
    padding: 80px 0 60px;
    min-height: 90vh;
  }

  .hero-container {
    flex-direction: column;
    gap: 30px;
    text-align: center;
  }

  .hero-title {
    font-size: 1.75rem;
    line-height: 1.3;
  }

  .hero-subtitle {
    font-size: 1rem;
    line-height: 1.5;
  }

  .hero-actions {
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .btn-primary,
  .btn-secondary {
    padding: 12px 24px;
    font-size: 1rem;
    width: 100%;
    max-width: 280px;
  }

  .hero-stats {
    flex-direction: column;
    gap: 20px;
    align-items: center;
  }

  .stat {
    text-align: center;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .demo-card {
    max-width: 100%;
    width: 100%;
  }

  .demo-header {
    width: 100%;
    padding: 12px 16px;
  }

  .demo-content {
    padding: 20px 16px;
  }

  .upload-area {
    padding: 16px;
  }

  .upload-icon {
    font-size: 1.5rem;
  }

  .upload-area p {
    font-size: 14px;
  }

  .file-types {
    font-size: 12px;
  }

  .processing {
    padding: 16px;
  }

  .spinner {
    width: 24px;
    height: 24px;
  }

  .results {
    gap: 8px;
  }

  .result-item {
    padding: 8px;
    font-size: 14px;
  }

  .result-icon {
    font-size: 1rem;
  }

  .features {
    padding: 60px 0;
  }

  .section-header h2 {
    font-size: 1.75rem;
  }

  .section-header p {
    font-size: 1rem;
  }

  .features-grid {
    gap: 20px;
  }

  .feature-card {
    padding: 24px 20px;
    flex: 1 1 100%;
    min-width: auto;
  }

  .feature-icon {
    font-size: 2rem;
    margin-bottom: 16px;
  }

  .feature-card h3 {
    font-size: 1.25rem;
    margin-bottom: 12px;
  }

  .feature-card p {
    font-size: 14px;
    line-height: 1.5;
  }

  .how-it-works {
    padding: 60px 0;
  }

  .steps {
    gap: 30px;
  }

  .step {
    padding: 30px 16px;
    flex: 1 1 100%;
    min-width: auto;
  }

  .step-number {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
    margin-bottom: 20px;
  }

  .step h3 {
    font-size: 1.25rem;
    margin-bottom: 12px;
  }

  .step p {
    font-size: 14px;
    line-height: 1.5;
  }

  .testimonials {
    padding: 60px 0;
  }

  .testimonials-grid {
    gap: 20px;
  }

  .testimonial {
    padding: 24px 20px;
    flex: 1 1 100%;
    min-width: auto;
  }

  .testimonial-content p {
    font-size: 14px;
    line-height: 1.5;
  }

  .author-avatar {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
  }

  .author-info h4 {
    font-size: 14px;
    margin-bottom: 2px;
  }

  .author-info span {
    font-size: 12px;
  }

  .pricing-card {
    padding: 30px 20px;
  }

  .amount {
    font-size: 2.5rem;
  }

  .features-list li {
    font-size: 14px;
    padding: 10px 0;
  }

  .cta {
    padding: 60px 0;
  }

  .cta-content h2 {
    font-size: 1.75rem;
  }

  .cta-content p {
    font-size: 1rem;
    margin-bottom: 24px;
  }

  .btn-primary.large {
    padding: 16px 32px;
    font-size: 1.1rem;
  }

  .footer {
    padding: 40px 0 16px;
  }

  .footer-content {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }

  .footer-section h3 {
    font-size: 1.25rem;
    margin-bottom: 12px;
  }

  .footer-section h4 {
    font-size: 1rem;
    margin-bottom: 12px;
  }

  .footer-section p {
    font-size: 14px;
  }

  .footer-section ul li {
    margin-bottom: 6px;
  }

  .footer-section ul li a {
    font-size: 14px;
  }
}
</style>

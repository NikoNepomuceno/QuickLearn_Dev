<script setup>
import { ref } from 'vue'
import { X, Shield, CheckCircle } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'accept'])

const isDisabled = ref(false)
const countdown = ref(0)

function close() {
  emit('update:modelValue', false)
}

function accept() {
  isDisabled.value = true
  countdown.value = 5
  emit('accept')
  emit('update:modelValue', false)

  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      isDisabled.value = false
    }
  }, 1000)
}
</script>

<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="props.modelValue" class="modal-backdrop" @click.self="close">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pp-title">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-content">
              <div class="icon-container">
                <Shield :size="24" />
              </div>
              <div class="header-text">
                <h3 id="pp-title" class="title">Privacy Policy</h3>
                <p class="subtitle">Please read and accept our privacy policy to continue</p>
              </div>
            </div>
            <button class="close-btn" @click="close" aria-label="Close">
              <X :size="20" />
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <div class="content" tabindex="0">
              <p class="intro">We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. By accessing or using QuickLearn, you agree to the terms of this Privacy Policy.</p>

              <div class="section">
                <h4>Information We Collect</h4>
                <p>When you use QuickLearn, we may collect the following types of information:</p>
                <ul>
                  <li><strong>Personal Information:</strong> Name, email address, and other details you provide when creating an account.</li>
                  <li><strong>Uploaded Content:</strong> Files, documents, and materials you upload for conversion into interactive quizzes.</li>
                  <li><strong>Usage Data:</strong> Information about how you interact with our platform, including device details, browser type, IP address, and activity logs.</li>
                  <li><strong>Cookies and Tracking Data:</strong> We use cookies and similar technologies to improve your user experience.</li>
                </ul>
              </div>

              <div class="section">
                <h4>How We Use Your Information</h4>
                <p>We use the information collected to:</p>
                <ul>
                  <li>Provide and maintain QuickLearn's services.</li>
                  <li>Convert uploaded materials into quizzes and other learning formats.</li>
                  <li>Personalize your experience on the platform.</li>
                  <li>Communicate updates, announcements, or support information.</li>
                  <li>Monitor usage to improve performance and security.</li>
                </ul>
              </div>

              <div class="section">
                <h4>How We Share Your Information</h4>
                <p>We do not sell or rent your personal information. We may share information only in the following cases:</p>
                <ul>
                  <li><strong>With Service Providers:</strong> Third parties that help us operate, secure, and improve our platform.</li>
                  <li><strong>For Legal Compliance:</strong> When required by law, regulation, or legal process.</li>
                  <li><strong>Business Transfers:</strong> In case of a merger, acquisition, or sale of assets, user information may be transferred.</li>
                </ul>
              </div>

              <div class="section">
                <h4>Data Security</h4>
                <p>We implement reasonable safeguards to protect your personal information. However, no system is 100% secure, and we cannot guarantee absolute protection.</p>
              </div>

              <div class="section">
                <h4>Data Retention</h4>
                <ul>
                  <li>Uploaded files are processed only for quiz generation and may be temporarily stored.</li>
                  <li>Personal data is retained for as long as your account is active or as needed to provide services.</li>
                  <li>You can request deletion of your account and associated data at any time.</li>
                </ul>
              </div>

              <div class="section">
                <h4>Your Rights</h4>
                <p>Depending on your jurisdiction, you may have the right to:</p>
                <ul>
                  <li>Access, correct, or delete your personal information.</li>
                  <li>Withdraw consent to data processing.</li>
                  <li>Request a copy of your data.</li>
                </ul>
                <p>To exercise these rights, please contact us at <a href="mailto:quicklearndev25@gmail.com" class="contact-link">quicklearndev25@gmail.com</a>.</p>
              </div>

              <div class="section">
                <h4>Children's Privacy</h4>
                <p>QuickLearn is not intended for children under the age of 13. We do not knowingly collect personal information from children.</p>
              </div>

              <div class="section">
                <h4>Changes to This Privacy Policy</h4>
                <p>We may update this Privacy Policy from time to time. Changes will be posted with an updated "Effective Date."</p>
              </div>

              <div class="section">
                <h4>Contact Us</h4>
                <p>If you have questions or concerns about this Privacy Policy, please contact us at:</p>
                <div class="contact-info">
                  <p><strong>QuickLearn Support</strong><br/>Email: <a href="mailto:quicklearndev25@gmail.com" class="contact-link">quicklearndev25@gmail.com</a></p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn primary" @click="accept" :disabled="isDisabled">
              <CheckCircle v-if="!isDisabled" :size="18" />
              <div v-else class="spinner"></div>
              {{ isDisabled ? `Please wait... ${countdown}s` : 'I Agree' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: scale(1);
  opacity: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-container {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.header-text {
  flex: 1;
}

.title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1a202c;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f1f5f9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #374151;
}

.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  color: #374151;
  line-height: 1.6;
}

.content::-webkit-scrollbar {
  width: 6px;
}

.content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.content::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.content::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.intro {
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.section {
  margin-bottom: 24px;
}

.section h4 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section h4::before {
  content: '';
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.section p {
  margin: 0 0 12px 0;
  color: #4a5568;
}

.section ul {
  margin: 12px 0;
  padding-left: 20px;
}

.section li {
  margin: 8px 0;
  color: #4a5568;
  position: relative;
}

.section li::marker {
  color: #667eea;
}

.contact-info {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.contact-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.contact-link:hover {
  color: #5a67d8;
  text-decoration: underline;
}

.modal-footer {
  padding: 20px 32px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: center;
}

.btn {
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  min-width: 140px;
  justify-content: center;
}

.btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Dark mode styles */
body.dark .modal {
  background: #1a202c;
  color: #e2e8f0;
}

body.dark .modal-header {
  background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  border-bottom-color: #4a5568;
}

body.dark .title {
  color: #e2e8f0;
}

body.dark .subtitle {
  color: #a0aec0;
}

body.dark .close-btn {
  background: #4a5568;
  color: #a0aec0;
}

body.dark .close-btn:hover {
  background: #718096;
  color: #e2e8f0;
}

body.dark .content {
  color: #e2e8f0;
}

body.dark .intro {
  background: #2d3748;
  color: #a0aec0;
  border-left-color: #667eea;
}

body.dark .section h4 {
  color: #e2e8f0;
}

body.dark .section p {
  color: #a0aec0;
}

body.dark .section li {
  color: #a0aec0;
}

body.dark .contact-info {
  background: #2d3748;
  border-color: #4a5568;
}

body.dark .modal-footer {
  background: #2d3748;
  border-top-color: #4a5568;
}

/* Animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal,
.modal-fade-leave-to .modal {
  transform: scale(0.9);
  opacity: 0;
}

.modal-fade-enter-active .modal,
.modal-fade-leave-active .modal {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-backdrop {
    padding: 16px;
  }

  .modal {
    max-height: 95vh;
  }

  .modal-header {
    padding: 20px 24px 16px;
  }

  .header-content {
    gap: 12px;
  }

  .icon-container {
    width: 40px;
    height: 40px;
  }

  .title {
    font-size: 20px;
  }

  .subtitle {
    font-size: 13px;
  }

  .content {
    padding: 20px 24px;
  }

  .intro {
    font-size: 14px;
    padding: 12px;
  }

  .section h4 {
    font-size: 16px;
  }

  .modal-footer {
    padding: 16px 24px 20px;
  }

  .btn {
    padding: 12px 24px;
    font-size: 15px;
    min-width: 120px;
  }
}

@media (max-width: 480px) {
  .modal-backdrop {
    padding: 12px;
  }

  .modal-header {
    padding: 16px 20px 12px;
  }

  .header-content {
    gap: 10px;
  }

  .icon-container {
    width: 36px;
    height: 36px;
  }

  .title {
    font-size: 18px;
  }

  .content {
    padding: 16px 20px;
  }

  .modal-footer {
    padding: 12px 20px 16px;
  }

  .btn {
    padding: 10px 20px;
    font-size: 14px;
    min-width: 100px;
  }
}
</style>
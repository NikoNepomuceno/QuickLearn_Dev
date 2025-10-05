<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'accept'])

function close() { emit('update:modelValue', false) }
function accept() {
  emit('accept')
  emit('update:modelValue', false)
}
</script>

<template>
  <teleport to="body">
    <transition name="pp-fade">
      <div v-if="props.modelValue" class="modal-backdrop" @click.self="close">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pp-title">
        <h3 id="pp-title" class="title">Privacy Policy</h3>
        <div class="content" tabindex="0">
          <p>We respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. By accessing or using QuickLearn, you agree to the terms of this Privacy Policy.</p>

          <h3>Information We Collect</h3>
          <p>When you use QuickLearn, we may collect the following types of information:</p>
          <ul>
            <li><strong>Personal Information:</strong> Name, email address, and other details you provide when creating an account.</li>
            <li><strong>Uploaded Content:</strong> Files, documents, and materials you upload for conversion into interactive quizzes.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with our platform, including device details, browser type, IP address, and activity logs.</li>
            <li><strong>Cookies and Tracking Data:</strong> We use cookies and similar technologies to improve your user experience.</li>
          </ul>

          <h3>How We Use Your Information</h3>
          <p>We use the information collected to:</p>
          <ul>
            <li>Provide and maintain QuickLearn’s services.</li>
            <li>Convert uploaded materials into quizzes and other learning formats.</li>
            <li>Personalize your experience on the platform.</li>
            <li>Communicate updates, announcements, or support information.</li>
            <li>Monitor usage to improve performance and security.</li>
          </ul>

          <h3>How We Share Your Information</h3>
          <p>We do not sell or rent your personal information. We may share information only in the following cases:</p>
          <ul>
            <li><strong>With Service Providers:</strong> Third parties that help us operate, secure, and improve our platform.</li>
            <li><strong>For Legal Compliance:</strong> When required by law, regulation, or legal process.</li>
            <li><strong>Business Transfers:</strong> In case of a merger, acquisition, or sale of assets, user information may be transferred.</li>
          </ul>

          <h3>Data Security</h3>
          <p>We implement reasonable safeguards to protect your personal information. However, no system is 100% secure, and we cannot guarantee absolute protection.</p>

          <h3>Data Retention</h3>
          <ul>
            <li>Uploaded files are processed only for quiz generation and may be temporarily stored.</li>
            <li>Personal data is retained for as long as your account is active or as needed to provide services.</li>
            <li>You can request deletion of your account and associated data at any time.</li>
          </ul>

          <h3>Your Rights</h3>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li>Access, correct, or delete your personal information.</li>
            <li>Withdraw consent to data processing.</li>
            <li>Request a copy of your data.</li>
          </ul>
          <p>To exercise these rights, please contact us at quicklearndev25@gmail.com.</p>

          <h3>Children’s Privacy</h3>
          <p>QuickLearn is not intended for children under the age of 13. We do not knowingly collect personal information from children.</p>

          <h3>Changes to This Privacy Policy</h3>
          <p>We may update this Privacy Policy from time to time. Changes will be posted with an updated “Effective Date.”</p>

          <h3>Contact Us</h3>
          <p>If you have questions or concerns about this Privacy Policy, please contact us at:</p>
          <p>QuickLearn Support<br/>Email: quicklearndev25@gmail.com</p>
        </div>
          <div class="actions">
            <button class="btn ghost" @click="close">Close</button>
            <button class="btn primary" @click="accept">I Agree</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
  
</template>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 3000; }
.modal { width: 100%; max-width: 640px; background: #fff; border: 1px solid #e6e8ec; border-radius: 12px; padding: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); display: grid; gap: 8px; transform: scale(0.98); opacity: 0.98; }
.title { margin: 0 0 4px 0; font-size: 20px; }
.content { max-height: 50vh; overflow: auto; padding-right: 4px; color: #374151; display: grid; gap: 6px; }
.content h4 { margin: 8px 0 4px; font-size: 15px; color: #111827; }
.content p { margin: 0; }
.content ul { margin: 6px 0; padding-left: 18px; }
.content li { margin: 4px 0; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
.btn { padding: 10px 14px; border-radius: 10px; cursor: pointer; }
.ghost { background: #fff; border: 1px solid #e6e8ec; }
.primary { background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); color: #fff; border: none; }

/* Fade + pop animation */
.pp-fade-enter-active, .pp-fade-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.pp-fade-enter-from, .pp-fade-leave-to { opacity: 0; }
.pp-fade-enter-from .modal, .pp-fade-leave-to .modal { transform: scale(0.96); opacity: 0; }
</style>



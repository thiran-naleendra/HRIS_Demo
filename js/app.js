(() => {
  'use strict';

  const element = (id) => document.getElementById(id);
  const loginScreen = element('login-screen');
  const verificationScreen = element('verification-screen');
  const video = element('camera-video');
  const frame = element('camera-frame');
  const status = element('camera-status');
  const help = element('camera-help');
  const placeholder = element('camera-placeholder');
  const continueButton = element('continue-button');
  const retryButton = element('retry-button');
  let stream = null;
  let detectionTimer = null;
  let requestVersion = 0;
  let progressTimer = null;

  function animateProgress(label, duration, version, onComplete) {
    const progress = element('verification-progress');
    const track = element('progress-track');
    const fill = element('progress-fill');
    const percent = element('progress-percent');
    progress.hidden = false;
    element('progress-label').textContent = label;
    track.setAttribute('aria-label', label);
    const started = performance.now();
    function update() {
      if (version !== requestVersion) return;
      const value = Math.min(100, Math.floor((performance.now() - started) / duration * 100));
      fill.style.width = `${value}%`;
      percent.textContent = `${value}%`;
      track.setAttribute('aria-valuenow', String(value));
      if (value < 100) progressTimer = setTimeout(update, 40);
      else onComplete();
    }
    update();
  }

  function startLiveness(version) {
    element('verification-title').textContent = 'Liveness Verification';
    const challenges = ['Turn face right', 'Turn face left', 'Blink twice', 'Look up'];
    status.className = 'camera-status';
    status.textContent = challenges[Math.floor(Math.random() * challenges.length)];
    help.textContent = 'Follow the challenge · Simulated verification';
    animateProgress('Liveness Verification', 3000, version, () => {
      status.className = 'camera-status success';
      status.textContent = '✓ Liveness Confirmed';
      help.textContent = 'Comparing biometric identity...';
      animateProgress('Comparing biometric identity...', 2000, version, () => {
        status.textContent = '✓ Face Match Successful';
        help.textContent = 'Simulated identity verification complete.';
        element('identity-employee-id').textContent = element('verification-id').textContent;
        element('identity-result').hidden = false;
        continueButton.hidden = false;
      });
    });
  }

  function stopCamera() {
    requestVersion += 1;
    clearTimeout(detectionTimer);
    clearTimeout(progressTimer);
    element('verification-progress').hidden = true;
    element('identity-result').hidden = true;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    frame.classList.remove('scanning', 'detected', 'completed');
    element('live-badge').hidden = true;
  }

  async function startCamera() {
    stopCamera();
    const version = requestVersion;
    element('verification-title').textContent = 'Face Verification';
    status.className = 'camera-status';
    status.textContent = 'Allow camera access to begin.';
    help.textContent = 'Position your face inside the frame';
    placeholder.hidden = false;
    placeholder.querySelector('span').textContent = '◎';
    placeholder.querySelector('p').textContent = 'Starting your camera…';
    continueButton.hidden = true;
    retryButton.hidden = true;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('SECURE_CONTEXT_REQUIRED');
      }
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'user' }, width: { ideal: 720 }, height: { ideal: 960 } }
      });
      if (version !== requestVersion) {
        cameraStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = cameraStream;
      video.srcObject = stream;
      await video.play();
      if (version !== requestVersion) return;
      placeholder.hidden = true;
      element('live-badge').hidden = false;
      frame.classList.add('scanning');
      status.textContent = 'Position your face inside the frame';
      help.textContent = 'Keep still while we verify · Demo simulation';
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (version === requestVersion) showCameraError('Camera disconnected. Please try again.');
      });
      detectionTimer = setTimeout(() => {
        if (version !== requestVersion) return;
        frame.classList.replace('scanning', 'detected');
        status.className = 'camera-status success';
        status.textContent = '✓ Face Detected';
        help.textContent = 'Preparing your liveness challenge…';
        detectionTimer = setTimeout(() => {
          if (version === requestVersion) startLiveness(version);
        }, 600);
      }, 2000);
    } catch (error) {
      if (version !== requestVersion) return;
      const messages = {
        NotAllowedError: 'Camera access was denied. Allow camera access in your browser settings, then try again.',
        NotFoundError: 'No camera found. Connect a camera and try again.',
        NotReadableError: 'Your camera is unavailable. Close other apps using it and try again.',
        SECURE_CONTEXT_REQUIRED: 'Camera access requires HTTPS or localhost. Open this page through a secure connection.'
      };
      showCameraError(messages[error.name] || messages[error.message] || 'Unable to start your camera. Check camera permissions and try again.');
    }
  }

  function showCameraError(message) {
    stopCamera();
    placeholder.hidden = false;
    placeholder.querySelector('p').textContent = 'Camera unavailable';
    status.className = 'camera-status error';
    status.textContent = message;
    help.textContent = 'A live camera is required for this demo.';
    continueButton.hidden = true;
    retryButton.hidden = false;
  }

  element('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = element('employee-id');
    const employeeId = input.value.trim();
    if (!employeeId) {
      input.setCustomValidity('Enter your employee ID.');
      input.reportValidity();
      return;
    }
    element('verification-id').textContent = employeeId;
    loginScreen.hidden = true;
    verificationScreen.hidden = false;
    element('attendance-card').setAttribute('aria-labelledby', 'verification-title');
    element('back-button').focus();
    startCamera();
  });
  element('employee-id').addEventListener('input', (event) => event.target.setCustomValidity(''));
  element('back-button').addEventListener('click', () => {
    stopCamera();
    verificationScreen.hidden = true;
    loginScreen.hidden = false;
    element('attendance-card').setAttribute('aria-labelledby', 'screen-title');
    element('employee-id').focus();
  });
  retryButton.addEventListener('click', startCamera);
  continueButton.addEventListener('click', () => {
    stopCamera();
    placeholder.hidden = false;
    placeholder.querySelector('p').textContent = 'Verification complete';
    placeholder.querySelector('span').textContent = '✓';
    frame.classList.add('completed');
    status.className = 'camera-status success';
    status.textContent = '✓ You’re ready for your workday';
    help.textContent = 'Demo complete. No attendance record has been saved.';
    continueButton.hidden = true;
    element('back-button').focus();
  });
  window.addEventListener('pagehide', stopCamera);
})();

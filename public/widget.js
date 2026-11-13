/**
 * danIAutoma Web Chat Widget (Embeddable Script)
 * Permite integrar el asistente de inteligencia artificial en cualquier sitio web externo.
 */
(function () {
  'use strict';

  // Evitar instanciación duplicada
  if (window.__daniAutomaWidgetLoaded) return;
  window.__daniAutomaWidgetLoaded = true;

  // Localizar el script actual para leer atributos data-*
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var scriptBaseUrl = currentScript && currentScript.src
    ? new URL(currentScript.src).origin
    : window.location.origin;

  var primaryColor = (currentScript && currentScript.getAttribute('data-atendia-color')) || '#6366f1';
  var widgetTitle = (currentScript && currentScript.getAttribute('data-atendia-title')) || 'Asistente danIAutoma';
  var welcomeText = (currentScript && currentScript.getAttribute('data-atendia-welcome')) ||
    '¡Hola! 👋 Soy el asistente virtual de danIAutoma. ¿Te gustaría conocer cómo automatizar la atención y citas de tu negocio con IA o agendar una llamada de diagnóstico gratuito?';

  var sessionId = localStorage.getItem('atendia_web_session');
  if (!sessionId) {
    sessionId = 'web_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('atendia_web_session', sessionId);
  }

  var isOpen = false;
  var isLoading = false;
  var messages = [{ sender: 'ASSISTANT', text: welcomeText }];

  // Inyectar estilos CSS encapsulados
  var style = document.createElement('style');
  style.innerHTML = `
    .dania-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .dania-launcher-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: ${primaryColor};
      color: #ffffff;
      border: 3px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
    }
    .dania-launcher-btn:hover {
      transform: scale(1.06);
    }
    .dania-launcher-btn svg {
      width: 26px;
      height: 26px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
    }
    .dania-chat-window {
      position: fixed;
      bottom: 88px;
      right: 20px;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 540px;
      max-height: calc(100vh - 110px);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.22), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e7e5e4;
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      animation: daniaFadeIn 0.25s ease-out;
    }
    @keyframes daniaFadeIn {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .dania-header {
      background-color: ${primaryColor};
      color: #ffffff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      shrink-0;
    }
    .dania-header-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .dania-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }
    .dania-header-title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
    }
    .dania-header-subtitle {
      font-size: 11px;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 2px;
    }
    .dania-pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #86efac;
      display: inline-block;
    }
    .dania-header-actions button {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.85);
      cursor: pointer;
      padding: 5px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .dania-header-actions button:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .dania-messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #fafaf9;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .dania-msg {
      max-width: 84%;
      padding: 10px 14px;
      font-size: 13px;
      line-height: 1.45;
      border-radius: 16px;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .dania-msg-assistant {
      align-self: flex-start;
      background: #ffffff;
      color: #292524;
      border: 1px solid #e7e5e4;
      border-top-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .dania-msg-customer {
      align-self: flex-end;
      background: ${primaryColor};
      color: #ffffff;
      border-top-right-radius: 4px;
      font-weight: 500;
    }
    .dania-typing {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e7e5e4;
      font-size: 12px;
      color: #78716c;
    }
    .dania-typing-dot {
      width: 6px;
      height: 6px;
      background: #a8a29e;
      border-radius: 50%;
      animation: daniaBounce 1.4s infinite ease-in-out both;
    }
    .dania-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .dania-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes daniaBounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .dania-input-area {
      padding: 12px;
      background: #ffffff;
      border-top: 1px solid #f5f5f4;
    }
    .dania-input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: #f5f5f4;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      padding: 6px 10px;
    }
    .dania-input-wrapper:focus-within {
      background: #ffffff;
      border-color: ${primaryColor};
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }
    .dania-textarea {
      flex: 1;
      background: transparent;
      border: none;
      font-size: 13px;
      color: #1c1917;
      outline: none;
      resize: none;
      max-height: 100px;
      min-height: 24px;
      font-family: inherit;
      padding: 4px 0;
    }
    .dania-send-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: ${primaryColor};
      color: #ffffff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s, transform 0.1s;
    }
    .dania-send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .dania-send-btn:not(:disabled):active {
      transform: scale(0.94);
    }
    .dania-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 6px;
      font-size: 10px;
      color: #a8a29e;
      padding: 0 4px;
    }
  `;
  document.head.appendChild(style);

  // Contenedor principal
  var container = document.createElement('div');
  container.className = 'dania-widget-container';
  container.innerHTML = `
    <!-- Ventana de Chat -->
    <div id="daniaChatWindow" class="dania-chat-window">
      <div class="dania-header">
        <div class="dania-header-info">
          <div class="dania-avatar">🤖</div>
          <div>
            <div class="dania-header-title">${widgetTitle}</div>
            <div class="dania-header-subtitle">
              <span class="dania-pulse"></span>
              <span>En línea • Asistente IA</span>
            </div>
          </div>
        </div>
        <div class="dania-header-actions">
          <button id="daniaResetBtn" title="Reiniciar chat">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button id="daniaCloseBtn" title="Cerrar chat">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div id="daniaMessages" class="dania-messages-area"></div>
      <div class="dania-input-area">
        <div class="dania-input-wrapper">
          <textarea id="daniaInput" class="dania-textarea" rows="1" placeholder="Escribe tu mensaje..."></textarea>
          <button id="daniaSendBtn" class="dania-send-btn" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div class="dania-footer">
          <span>Powered by <b>danIAutoma</b></span>
        </div>
      </div>
    </div>

    <!-- Botón Launcher -->
    <button id="daniaLauncher" class="dania-launcher-btn" aria-label="Abrir asistente de IA">
      <svg id="daniaIconOpen" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <svg id="daniaIconClose" style="display:none;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  document.body.appendChild(container);

  var chatWindow = document.getElementById('daniaChatWindow');
  var launcherBtn = document.getElementById('daniaLauncher');
  var iconOpen = document.getElementById('daniaIconOpen');
  var iconClose = document.getElementById('daniaIconClose');
  var closeBtn = document.getElementById('daniaCloseBtn');
  var resetBtn = document.getElementById('daniaResetBtn');
  var messagesArea = document.getElementById('daniaMessages');
  var textarea = document.getElementById('daniaInput');
  var sendBtn = document.getElementById('daniaSendBtn');

  function renderMessages() {
    messagesArea.innerHTML = '';
    messages.forEach(function (m) {
      var div = document.createElement('div');
      div.className = 'dania-msg ' + (m.sender === 'ASSISTANT' ? 'dania-msg-assistant' : 'dania-msg-customer');
      div.textContent = m.text;
      messagesArea.appendChild(div);
    });

    if (isLoading) {
      var typingDiv = document.createElement('div');
      typingDiv.className = 'dania-typing';
      typingDiv.innerHTML = '<span class="dania-typing-dot"></span><span class="dania-typing-dot"></span><span class="dania-typing-dot"></span><span>Escribiendo...</span>';
      messagesArea.appendChild(typingDiv);
    }

    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function toggleWidget(open) {
    isOpen = typeof open === 'boolean' ? open : !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    iconOpen.style.display = isOpen ? 'none' : 'block';
    iconClose.style.display = isOpen ? 'block' : 'none';
    if (isOpen) {
      renderMessages();
      setTimeout(function () { textarea.focus(); }, 150);
    }
  }

  launcherBtn.addEventListener('click', function () { toggleWidget(); });
  closeBtn.addEventListener('click', function () { toggleWidget(false); });

  resetBtn.addEventListener('click', function () {
    if (isLoading) return;
    sessionId = 'web_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('atendia_web_session', sessionId);
    messages = [{ sender: 'ASSISTANT', text: welcomeText }];
    textarea.value = '';
    renderMessages();
  });

  textarea.addEventListener('input', function () {
    sendBtn.disabled = !textarea.value.trim() || isLoading;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  });

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  function handleSend() {
    var text = textarea.value.trim();
    if (!text || isLoading) return;

    messages.push({ sender: 'CUSTOMER', text: text });
    textarea.value = '';
    textarea.style.height = 'auto';
    sendBtn.disabled = true;
    isLoading = true;
    renderMessages();

    fetch(scriptBaseUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        sessionId: sessionId,
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        messages.push({
          sender: 'ASSISTANT',
          text: data.response || 'Disculpa, no he podido procesar tu solicitud en este momento.',
        });
      })
      .catch(function () {
        messages.push({
          sender: 'ASSISTANT',
          text: 'Error temporal de conexión con el asistente.',
        });
      })
      .finally(function () {
        isLoading = false;
        renderMessages();
      });
  }

  sendBtn.addEventListener('click', handleSend);
  renderMessages();
})();

/**
 * Chat UI for Expanso Documentation
 * A simple web interface for chatting with the documentation
 */

export function getChatHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expanso Docs Chat</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --surface: #141414;
      --surface-hover: #1f1f1f;
      --border: #2a2a2a;
      --text: #fafafa;
      --text-muted: #a3a3a3;
      --primary: #a78bfa;
      --primary-hover: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    header h1 { font-size: 1.25rem; font-weight: 600; }
    header a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.875rem;
    }
    header a:hover { color: var(--primary); }
    .main-container {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    .chat-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border);
      min-width: 400px;
    }
    .code-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #1e1e2e;
      min-width: 400px;
    }
    .code-panel-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface);
    }
    .code-panel-header h2 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .code-panel-header button {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      cursor: pointer;
      border-radius: 0.25rem;
    }
    .code-panel-header button:hover {
      background: var(--primary);
      border-color: var(--primary);
    }
    .feedback-buttons {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .feedback-buttons button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .feedback-buttons button.valid { color: #86efac; }
    .feedback-buttons button.invalid { color: #fca5a5; }
    .feedback-buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .feedback-buttons button.submitted {
      background: var(--primary);
      border-color: var(--primary);
    }
    .feedback-label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .code-content {
      flex: 1;
      padding: 1.5rem;
      overflow: auto;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre;
      color: #f5f5f5;
    }
    .code-content .empty-state {
      color: var(--text-muted);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-style: italic;
      white-space: normal;
    }
    .yaml-key { color: #93c5fd; }
    .yaml-string { color: #86efac; }
    .yaml-number { color: #fdba74; }
    .yaml-comment { color: #9ca3af; font-style: italic; }
    .yaml-bool { color: #d8b4fe; }
    .chat-container {
      flex: 1;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
    }
    @media (max-width: 900px) {
      .main-container { flex-direction: column; }
      .chat-panel, .code-panel { min-width: 100%; border-right: none; }
      .chat-panel { border-bottom: 1px solid var(--border); }
      .code-panel { max-height: 40vh; }
    }
    .message {
      padding: 1rem;
      border-radius: 0.75rem;
      max-width: 85%;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .message.user {
      background: var(--primary);
      color: white;
      align-self: flex-end;
    }
    .message.assistant {
      background: var(--surface);
      border: 1px solid var(--border);
      align-self: flex-start;
    }
    .sources {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
      font-size: 0.8125rem;
    }
    .sources-title {
      color: var(--text-muted);
      margin-bottom: 0.375rem;
    }
    .sources a {
      display: block;
      color: var(--primary);
      text-decoration: none;
      padding: 0.25rem 0;
    }
    .sources a:hover { text-decoration: underline; }
    .input-container {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .input-wrapper {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      gap: 0.75rem;
    }
    input[type="text"] {
      flex: 1;
      padding: 0.75rem 1rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      color: var(--text);
      font-size: 1rem;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: var(--primary);
    }
    button {
      padding: 0.75rem 1.5rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: var(--primary-hover); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading {
      display: flex;
      gap: 0.25rem;
      padding: 0.5rem 0;
    }
    .loading span {
      width: 0.5rem;
      height: 0.5rem;
      background: var(--text-muted);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .loading span:nth-child(1) { animation-delay: -0.32s; }
    .loading span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .welcome {
      text-align: center;
      padding: 3rem 1.5rem;
      color: var(--text-muted);
    }
    .welcome h2 {
      color: var(--text);
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .welcome p {
      max-width: 400px;
      margin: 0 auto 1.5rem;
      line-height: 1.5;
    }
    .examples {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }
    .examples button {
      padding: 0.5rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      font-size: 0.875rem;
    }
    .examples button:hover {
      background: var(--surface-hover);
      border-color: var(--primary);
    }
  </style>
</head>
<body>
  <header>
    <h1>Expanso Docs Chat</h1>
    <a href="https://docs.expanso.io" target="_blank">Documentation</a>
    <a href="https://expanso.io" target="_blank">Expanso</a>
    <a href="/.well-known/mcp.json" target="_blank">MCP Config</a>
  </header>

  <div class="main-container">
    <div class="chat-panel">
      <div class="chat-container" id="chat">
        <div class="welcome" id="welcome">
          <h2>Ask about Expanso</h2>
          <p>Chat with our documentation. I can help you with pipelines, CLI commands, deployment, and more.</p>
          <div class="examples">
            <button onclick="askQuestion('How do I install Expanso?')">Install Expanso</button>
            <button onclick="askQuestion('What is a pipeline component?')">Pipeline components</button>
            <button onclick="askQuestion('Show me a Kafka to S3 pipeline')">Kafka to S3 pipeline</button>
          </div>
        </div>
      </div>

      <div class="input-container">
        <form class="input-wrapper" onsubmit="sendMessage(event)">
          <input type="text" id="input" placeholder="Ask about Expanso..." autocomplete="off">
          <button type="submit" id="send">Send</button>
        </form>
      </div>
    </div>

    <div class="code-panel">
      <div class="code-panel-header">
        <h2>Pipeline Configuration</h2>
        <div class="feedback-buttons" id="feedbackButtons" style="display: none;">
          <span class="feedback-label">Is this YAML correct?</span>
          <button onclick="submitFeedback(true)" class="valid" id="validBtn" title="This YAML is correct">Yes</button>
          <button onclick="submitFeedback(false)" class="invalid" id="invalidBtn" title="This YAML has issues">No</button>
        </div>
        <button onclick="copyCode()" id="copyBtn">Copy</button>
      </div>
      <div class="code-content" id="codeContent">
        <span class="empty-state">Pipeline YAML will appear here when discussing configurations...</span>
      </div>
    </div>
  </div>

  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const codeContent = document.getElementById('codeContent');
    const feedbackButtons = document.getElementById('feedbackButtons');
    const validBtn = document.getElementById('validBtn');
    const invalidBtn = document.getElementById('invalidBtn');
    let history = [];
    let isLoading = false;
    let currentCode = '';
    let lastUserMessage = '';
    let feedbackSubmitted = false;

    function highlightYaml(code) {
      return code
        .replace(/^(\\s*#.*)$/gm, '<span class="yaml-comment">$1</span>')
        .replace(/^(\\s*[a-zA-Z_][a-zA-Z0-9_-]*)(:)/gm, '<span class="yaml-key">$1</span>$2')
        .replace(/:\\s*"([^"]*)"/g, ': <span class="yaml-string">"$1"</span>')
        .replace(/:\\s*'([^']*)'/g, ": <span class=\\"yaml-string\\">'$1'</span>")
        .replace(/:\\s*(true|false)$/gm, ': <span class="yaml-bool">$1</span>')
        .replace(/:\\s*(\\d+\\.?\\d*)$/gm, ': <span class="yaml-number">$1</span>');
    }

    function extractYaml(text) {
      var codeBlockRegex = /\`\`\`(?:yaml|yml)?\\n([\\s\\S]*?)\`\`\`/g;
      var matches = [];
      var match;
      while ((match = codeBlockRegex.exec(text)) !== null) {
        matches.push(match[1].trim());
      }
      return matches.join('\\n\\n---\\n\\n');
    }

    function removeCodeBlocks(text) {
      return text.replace(/\`\`\`(?:yaml|yml)?\\n[\\s\\S]*?\`\`\`/g, '[See pipeline in right panel]').trim();
    }

    function updateCodePanel(yaml) {
      if (yaml) {
        currentCode = yaml;
        codeContent.innerHTML = highlightYaml(yaml);
        feedbackButtons.style.display = 'flex';
        resetFeedback();
      }
    }

    function copyCode() {
      if (currentCode) {
        navigator.clipboard.writeText(currentCode).then(function() {
          var btn = document.getElementById('copyBtn');
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = 'Copy'; }, 2000);
        });
      }
    }

    async function submitFeedback(isValid) {
      if (feedbackSubmitted || !currentCode) return;

      feedbackSubmitted = true;
      validBtn.disabled = true;
      invalidBtn.disabled = true;

      try {
        const res = await fetch('/api/yaml-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            yaml: currentCode,
            isValid: isValid,
            userMessage: lastUserMessage
          })
        });

        const data = await res.json();

        // Show result
        if (isValid) {
          validBtn.classList.add('submitted');
          validBtn.textContent = 'Thanks!';
        } else {
          invalidBtn.classList.add('submitted');
          invalidBtn.textContent = 'Reported';
        }

        // Show validator result if user said invalid and we agree
        if (!isValid && data.validatorResult && !data.validatorResult.valid) {
          var errorsHtml = data.validatorResult.errors.map(function(e) {
            return '<div style="color:#fca5a5;font-size:12px;margin-top:8px;">' +
              e.path + ': ' + e.message +
              (e.suggestion ? '<br><span style="color:#a3a3a3;">Tip: ' + e.suggestion + '</span>' : '') +
              '</div>';
          }).join('');
          codeContent.innerHTML += errorsHtml;
        }

      } catch (err) {
        console.error('Feedback error:', err);
        validBtn.textContent = 'Error';
        invalidBtn.textContent = 'Error';
      }
    }

    function resetFeedback() {
      feedbackSubmitted = false;
      validBtn.disabled = false;
      invalidBtn.disabled = false;
      validBtn.classList.remove('submitted');
      invalidBtn.classList.remove('submitted');
      validBtn.textContent = 'Yes';
      invalidBtn.textContent = 'No';
    }

    function addMessage(content, role, sources) {
      const welcome = document.getElementById('welcome');
      if (welcome) welcome.remove();

      var displayContent = content;
      if (role === 'assistant') {
        var yaml = extractYaml(content);
        if (yaml) {
          updateCodePanel(yaml);
          displayContent = removeCodeBlocks(content);
        }
      }

      const div = document.createElement('div');
      div.className = 'message ' + role;
      div.textContent = displayContent;

      if (role === 'assistant' && sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'sources';

        const title = document.createElement('div');
        title.className = 'sources-title';
        title.textContent = 'Sources:';
        sourcesDiv.appendChild(title);

        sources.forEach(function(s) {
          const link = document.createElement('a');
          link.href = s.url;
          link.target = '_blank';
          link.textContent = s.title;
          sourcesDiv.appendChild(link);
        });

        div.appendChild(sourcesDiv);
      }

      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function addLoading() {
      const div = document.createElement('div');
      div.className = 'message assistant';
      div.id = 'loading';

      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      for (let i = 0; i < 3; i++) {
        loadingDiv.appendChild(document.createElement('span'));
      }
      div.appendChild(loadingDiv);

      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function removeLoading() {
      const loading = document.getElementById('loading');
      if (loading) loading.remove();
    }

    async function sendMessage(e) {
      e.preventDefault();
      const message = input.value.trim();
      if (!message || isLoading) return;

      isLoading = true;
      sendBtn.disabled = true;
      input.value = '';
      lastUserMessage = message;

      addMessage(message, 'user');
      addLoading();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message, history: history })
        });

        const data = await res.json();
        removeLoading();

        if (data.error) {
          addMessage('Error: ' + data.error, 'assistant', []);
        } else {
          addMessage(data.response, 'assistant', data.sources || []);
          history.push({ role: 'user', content: message });
          history.push({ role: 'assistant', content: data.response });
        }
      } catch (err) {
        removeLoading();
        addMessage('Sorry, something went wrong. Please try again.', 'assistant', []);
      }

      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }

    function askQuestion(q) {
      input.value = q;
      sendMessage({ preventDefault: function() {} });
    }

    input.focus();
  </script>
</body>
</html>`;
}

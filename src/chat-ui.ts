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
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
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
    .new-chat-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      cursor: pointer;
      margin-left: auto;
    }
    .new-chat-btn:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
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
      overflow: hidden;
    }
    .code-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #1e1e2e;
      min-width: 400px;
      overflow: hidden;
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
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .code-editor {
      flex: 1;
      width: 100%;
      padding: 1.5rem;
      border: none;
      background: transparent;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 14px;
      line-height: 1.6;
      color: #f5f5f5;
      resize: none;
      outline: none;
    }
    .code-editor::placeholder {
      color: var(--text-muted);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-style: italic;
    }
    .code-editor.error-pulse {
      animation: errorPulse 0.6s ease-out;
    }
    @keyframes errorPulse {
      0% { box-shadow: inset 0 0 0 3px #ef4444; background: rgba(239, 68, 68, 0.15); }
      100% { box-shadow: none; background: transparent; }
    }
    .validation-result {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border);
      font-size: 0.8rem;
      max-height: 180px;
      overflow-y: auto;
    }
    .validation-result.valid {
      background: rgba(34, 197, 94, 0.1);
      border-top: 2px solid #22c55e;
    }
    .validation-result.valid .validation-icon { color: #22c55e; }
    .validation-result.invalid {
      background: rgba(239, 68, 68, 0.05);
      border-top: 2px solid #ef4444;
    }
    .validation-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
      font-size: 0.85rem;
    }
    .validation-icon { font-size: 1rem; }
    .validation-header.valid { color: #86efac; }
    .validation-header.invalid { color: #fca5a5; }
    .error-item {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.75rem;
      margin: 0.25rem 0;
      background: rgba(0,0,0,0.2);
      border-radius: 4px;
      border-left: 3px solid #ef4444;
      cursor: pointer;
      transition: background 0.15s;
    }
    .error-item:hover { background: rgba(0,0,0,0.35); }
    .error-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .error-line-num {
      font-family: 'SF Mono', monospace;
      font-size: 0.7rem;
      padding: 0.125rem 0.375rem;
      background: #ef4444;
      color: white;
      border-radius: 3px;
      font-weight: 600;
    }
    .error-message {
      color: #fca5a5;
      font-size: 0.8rem;
    }
    .error-suggestion {
      color: #a3a3a3;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      padding-left: 0.5rem;
      border-left: 2px solid #4b5563;
    }
    .error-path {
      color: #6b7280;
      font-size: 0.7rem;
      font-family: 'SF Mono', monospace;
      margin-top: 0.25rem;
    }
    .validate-btn {
      background: var(--primary) !important;
      border-color: var(--primary) !important;
      color: white !important;
    }
    .validate-btn:hover {
      background: var(--primary-hover) !important;
      border-color: var(--primary-hover) !important;
    }
    .validate-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
    /* Markdown in messages */
    .message p { margin: 0 0 0.5rem 0; }
    .message p:last-child { margin-bottom: 0; }
    .message a {
      color: var(--primary);
      text-decoration: none;
    }
    .message a:hover { text-decoration: underline; }
    .message code {
      background: rgba(0,0,0,0.1);
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.875em;
    }
    .message strong { font-weight: 600; }
    .md-list-item {
      padding-left: 0.5rem;
      margin: 0.25rem 0;
    }
    .md-bullet {
      color: var(--primary);
      margin-right: 0.25rem;
    }
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
    .loading-text {
      color: var(--text-muted);
      font-style: italic;
      font-size: 0.875rem;
    }
    .follow-ups {
      padding: 0.75rem 1.5rem;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .follow-ups-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-right: 0.5rem;
    }
    .follow-ups-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .follow-ups-chips button {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 1rem;
    }
    .follow-ups-chips button:hover {
      border-color: var(--primary);
      background: var(--surface-hover);
    }
    .follow-ups-chips button.contextual {
      border-color: var(--primary);
      background: rgba(167, 139, 250, 0.1);
    }
  </style>
</head>
<body>
  <header>
    <h1>Expanso Docs Chat</h1>
    <a href="https://docs.expanso.io" target="_blank">Documentation</a>
    <a href="https://expanso.io" target="_blank">Expanso</a>
    <a href="/.well-known/mcp.json" target="_blank">MCP Config</a>
    <button id="newChatBtn" class="new-chat-btn" title="Start a new conversation">New Chat</button>
  </header>

  <div class="main-container">
    <div class="chat-panel">
      <div class="chat-container" id="chat">
        <div class="welcome" id="welcome">
          <h2>Ask about Expanso</h2>
          <p>Chat with our documentation. I can help you with pipelines, CLI commands, deployment, and more.</p>
          <div class="examples" id="examples">
            <span class="loading-text">Loading examples...</span>
          </div>
        </div>
      </div>

      <div class="follow-ups" id="followUps" style="display: none;">
        <span class="follow-ups-label">Try next:</span>
        <div class="follow-ups-chips" id="followUpsChips"></div>
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
        <button onclick="validateCode()" id="validateBtn" class="validate-btn">Validate</button>
        <button onclick="copyCode()" id="copyBtn">Copy</button>
      </div>
      <div class="code-content" id="codeContent">
        <textarea id="codeEditor" class="code-editor" placeholder="Pipeline YAML will appear here when discussing configurations...&#10;&#10;You can edit the YAML directly and click Validate to check it." spellcheck="false"></textarea>
        <div id="validationResult" class="validation-result" style="display: none;"></div>
      </div>
    </div>
  </div>

  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const codeContent = document.getElementById('codeContent');
    const codeEditor = document.getElementById('codeEditor');
    const validationResult = document.getElementById('validationResult');
    const validateBtn = document.getElementById('validateBtn');
    const feedbackButtons = document.getElementById('feedbackButtons');
    const validBtn = document.getElementById('validBtn');
    const invalidBtn = document.getElementById('invalidBtn');
    let history = [];
    let isLoading = false;
    let currentCode = '';
    let lastUserMessage = '';
    let feedbackSubmitted = false;
    // Track validation state for false positive reporting
    let lastValidationPassed = false;
    let lastValidatedYaml = '';

    // Keep currentCode in sync with textarea edits
    codeEditor.addEventListener('input', function() {
      currentCode = codeEditor.value;
      // Clear validation result when user edits
      validationResult.style.display = 'none';
    });

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
      return text.replace(/\`\`\`(?:yaml|yml)?\\n[\\s\\S]*?\`\`\`/g, '\\n\\n➡️ **See pipeline in right panel**\\n\\n').trim();
    }

    // Parse markdown text and return a document fragment with safe DOM elements
    function parseMarkdown(text) {
      var fragment = document.createDocumentFragment();
      var lines = text.split('\\n');
      var currentParagraph = null;

      function flushParagraph() {
        if (currentParagraph && currentParagraph.childNodes.length > 0) {
          fragment.appendChild(currentParagraph);
          currentParagraph = null;
        }
      }

      function parseInline(str, container) {
        // Parse inline markdown: **bold**, [link](url), \`code\`
        var remaining = str;
        while (remaining.length > 0) {
          // Check for bold **text**
          var boldMatch = remaining.match(/^\\*\\*([^*]+)\\*\\*/);
          if (boldMatch) {
            var strong = document.createElement('strong');
            strong.textContent = boldMatch[1];
            container.appendChild(strong);
            remaining = remaining.slice(boldMatch[0].length);
            continue;
          }
          // Check for links [text](url)
          var linkMatch = remaining.match(/^\\[([^\\]]+)\\]\\(([^)]+)\\)/);
          if (linkMatch) {
            var a = document.createElement('a');
            a.href = linkMatch[2];
            a.textContent = linkMatch[1];
            a.target = '_blank';
            a.rel = 'noopener';
            container.appendChild(a);
            remaining = remaining.slice(linkMatch[0].length);
            continue;
          }
          // Check for inline code \`text\`
          var codeMatch = remaining.match(/^\`([^\`]+)\`/);
          if (codeMatch) {
            var code = document.createElement('code');
            code.textContent = codeMatch[1];
            container.appendChild(code);
            remaining = remaining.slice(codeMatch[0].length);
            continue;
          }
          // No match - add next character as text
          var idx1 = remaining.indexOf('*');
          var idx2 = remaining.indexOf('[');
          var idx3 = remaining.indexOf(String.fromCharCode(96));
          var nextSpecial = Math.min(
            idx1 === -1 ? remaining.length : idx1,
            idx2 === -1 ? remaining.length : idx2,
            idx3 === -1 ? remaining.length : idx3
          );
          if (nextSpecial === remaining.length) nextSpecial = -1;
          if (nextSpecial === -1) {
            container.appendChild(document.createTextNode(remaining));
            break;
          } else if (nextSpecial === 0) {
            container.appendChild(document.createTextNode(remaining[0]));
            remaining = remaining.slice(1);
          } else {
            container.appendChild(document.createTextNode(remaining.slice(0, nextSpecial)));
            remaining = remaining.slice(nextSpecial);
          }
        }
      }

      lines.forEach(function(line) {
        // Empty line - start new paragraph
        if (line.trim() === '') {
          flushParagraph();
          return;
        }

        // List item
        if (line.match(/^\\s*[-*]\\s+/)) {
          flushParagraph();
          var li = document.createElement('div');
          li.className = 'md-list-item';
          var bullet = document.createElement('span');
          bullet.className = 'md-bullet';
          bullet.textContent = '• ';
          li.appendChild(bullet);
          var content = line.replace(/^\\s*[-*]\\s+/, '').trim();
          parseInline(content, li);
          fragment.appendChild(li);
          return;
        }

        // Regular text - add to current paragraph
        if (!currentParagraph) {
          currentParagraph = document.createElement('p');
        } else {
          currentParagraph.appendChild(document.createElement('br'));
        }
        parseInline(line.trim(), currentParagraph);
      });

      flushParagraph();
      return fragment;
    }

    // Follow-up suggestion mappings - prompts explicitly reference modifying the EXISTING pipeline
    var COMPONENT_SUGGESTIONS = {
      'kafka': [
        { label: 'Add dead letter queue', prompt: 'Modify the pipeline above: add a dead letter queue for failed messages' },
        { label: 'Configure consumer groups', prompt: 'Modify the pipeline above: configure consumer groups for load balancing' }
      ],
      'aws_s3': [
        { label: 'Add partitioning', prompt: 'Modify the pipeline above: add date-based partitioning to the S3 path' },
        { label: 'Add compression', prompt: 'Modify the pipeline above: add gzip compression to the S3 output' }
      ],
      'http': [
        { label: 'Add authentication', prompt: 'Modify the pipeline above: add API key authentication' },
        { label: 'Add rate limiting', prompt: 'Modify the pipeline above: add rate limiting to the HTTP endpoint' }
      ],
      'elasticsearch': [
        { label: 'Optimize bulk indexing', prompt: 'Modify the pipeline above: optimize bulk indexing with batching' }
      ],
      'mapping': [
        { label: 'Add validation', prompt: 'Modify the pipeline above: add schema validation' }
      ]
    };

    var GENERIC_SUGGESTIONS = [
      { label: 'Add error handling', prompt: 'Modify the pipeline above: add error handling and retry logic' },
      { label: 'Add filtering', prompt: 'Modify the pipeline above: add a filter to only process certain messages' },
      { label: 'Add batching', prompt: 'Modify the pipeline above: add message batching before output' },
      { label: 'Change output', prompt: 'Modify the pipeline above: change the output to a different destination' },
      { label: 'Start fresh (/new)', prompt: '/new' }
    ];

    function showFollowUpSuggestions(yaml) {
      var suggestions = [];
      var yamlLower = yaml.toLowerCase();

      // Find contextual suggestions based on detected components
      for (var comp in COMPONENT_SUGGESTIONS) {
        if (yamlLower.indexOf(comp) !== -1) {
          var compSuggestions = COMPONENT_SUGGESTIONS[comp];
          for (var i = 0; i < Math.min(1, compSuggestions.length); i++) {
            suggestions.push({ label: compSuggestions[i].label, prompt: compSuggestions[i].prompt, contextual: true });
          }
        }
      }
      // Limit contextual to 2
      suggestions = suggestions.slice(0, 2);

      // Add generic suggestions to fill up to 5 total
      var remaining = 5 - suggestions.length;
      for (var i = 0; i < remaining && i < GENERIC_SUGGESTIONS.length; i++) {
        suggestions.push({ label: GENERIC_SUGGESTIONS[i].label, prompt: GENERIC_SUGGESTIONS[i].prompt, contextual: false });
      }

      // Render using safe DOM methods
      var chips = document.getElementById('followUpsChips');
      while (chips.firstChild) {
        chips.removeChild(chips.firstChild);
      }
      suggestions.forEach(function(s) {
        var btn = document.createElement('button');
        btn.textContent = s.label;
        if (s.contextual) {
          btn.className = 'contextual';
        }
        btn.onclick = function() { askFollowUp(s.prompt); };
        chips.appendChild(btn);
      });
      document.getElementById('followUps').style.display = 'block';
    }

    function hideFollowUpSuggestions() {
      document.getElementById('followUps').style.display = 'none';
    }

    function askFollowUp(prompt) {
      hideFollowUpSuggestions();
      input.value = prompt;
      sendMessage({ preventDefault: function() {} });
    }

    function updateCodePanel(yaml) {
      if (yaml) {
        currentCode = yaml;
        codeEditor.value = yaml;
        feedbackButtons.style.display = 'flex';
        validationResult.style.display = 'none';
        resetFeedback();
        showFollowUpSuggestions(yaml);
      }
    }

    // Find approximate line number from YAML path like "root.pipeline.processors[0]"
    function findLineFromPath(yaml, path) {
      if (!path || !yaml) return null;
      var lines = yaml.split('\\n');
      var parts = path.replace(/^root\\.?/, '').split(/[.\\[\\]]+/).filter(Boolean);
      if (parts.length === 0) return 1;
      var searchKey = parts[0];
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].match(new RegExp('^\\\\s*' + searchKey + '\\\\s*:'))) {
          if (parts.length > 1) {
            var nestedKey = parts[parts.length - 1];
            for (var j = i + 1; j < Math.min(i + 50, lines.length); j++) {
              if (lines[j].match(new RegExp('^\\\\s*' + nestedKey + '\\\\s*:'))) return j + 1;
            }
          }
          return i + 1;
        }
      }
      return null;
    }

    // Jump to line in editor with visual pulse
    function jumpToLine(lineNum) {
      if (!lineNum) return;
      var lines = codeEditor.value.split('\\n');
      var pos = 0;
      for (var i = 0; i < lineNum - 1 && i < lines.length; i++) pos += lines[i].length + 1;
      codeEditor.focus();
      codeEditor.setSelectionRange(pos, pos + (lines[lineNum - 1] || '').length);
      codeEditor.scrollTop = Math.max(0, (lineNum - 3) * 18);
      // Trigger visual pulse
      codeEditor.classList.remove('error-pulse');
      void codeEditor.offsetWidth; // Force reflow
      codeEditor.classList.add('error-pulse');
    }

    // Convert technical error messages to user-friendly ones
    function humanizeError(err) {
      var category = err.category || '';
      var path = err.path || '';
      var hallucination = err.hallucination || '';
      var correction = err.correction || err.suggestion || '';

      // Extract the field/component name from path (e.g., "input.kafka.brokrs" -> "brokrs")
      var parts = path.split('.');
      var fieldName = parts[parts.length - 1] || hallucination;

      // Map categories to user-friendly messages
      var messages = {
        'IMAGINED_COMPONENT': 'Unknown component "' + (hallucination || fieldName) + '"',
        'IMAGINED_FIELD': '"' + (hallucination || fieldName) + '" is not a valid field',
        'IMAGINED_STRUCTURE': '"' + (hallucination || fieldName) + '" is not valid here',
        'IMAGINED_SYNTAX': 'Syntax error in "' + (hallucination || fieldName) + '"',
        'WRONG_TYPE': '"' + (hallucination || fieldName) + '" has wrong type',
        'DUPLICATE_LABEL': '"' + (hallucination || fieldName) + '" is duplicated',
        'UNDEFINED_RESOURCE': '"' + (hallucination || fieldName) + '" is not defined'
      };

      var message = messages[category] || err.message || 'Invalid: ' + fieldName;

      // Add suggestion if available - format appropriately based on content
      var suggestion = null;
      if (correction) {
        // Check what kind of correction this is
        var isListOfOptions = correction.indexOf(',') >= 0;
        var isInstruction = /^(Remove |Add |Use |Change |Replace |Delete |Move )/.test(correction);
        var hasExplanation = correction.indexOf('(') >= 0 && correction.indexOf(')') >= 0;
        var isTruncated = correction.indexOf('...') >= 0;
        var isLong = correction.length > 60;

        if (isListOfOptions || isTruncated) {
          // List of valid options - truncate if too long
          var optionsList = correction.length > 100
            ? correction.substring(0, 100) + '...'
            : correction;
          suggestion = 'Valid options: ' + optionsList;
        } else if (isInstruction || isLong) {
          // Show instruction as-is, it's already actionable
          suggestion = correction;
        } else if (hasExplanation) {
          // Has explanation in parens - extract just the field name
          var fieldOnly = correction.split('(')[0].trim();
          suggestion = fieldOnly ? 'Use "' + fieldOnly + '"' : correction;
        } else {
          // Simple direct replacement
          suggestion = 'Use "' + correction + '" instead';
        }
      }

      return {
        message: message,
        suggestion: suggestion,
        line: err.line,
        path: err.path
      };
    }

    // Display validation errors elegantly
    // first_error is the prioritized error from validator with accurate line number
    function displayErrors(errors, yaml, firstError) {
      validationResult.innerHTML = '';
      validationResult.className = 'validation-result invalid';

      var header = document.createElement('div');
      header.className = 'validation-header';
      header.textContent = '\\u2717 ' + errors.length + ' error' + (errors.length !== 1 ? 's' : '');
      validationResult.appendChild(header);

      // Auto-jump to first error if we have a line number
      if (firstError && firstError.line) {
        setTimeout(function() { jumpToLine(firstError.line); }, 100);
      }

      errors.forEach(function(err, idx) {
        var errObj = typeof err === 'string' ? { message: err } : err;
        // Humanize the error for better display
        var humanized = humanizeError(errObj);
        // Prefer line from error object, fall back to heuristic
        var lineNum = humanized.line || errObj.line || findLineFromPath(yaml, errObj.path);

        var item = document.createElement('div');
        item.className = 'error-item';
        if (lineNum) item.onclick = function() { jumpToLine(lineNum); };

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';

        if (lineNum) {
          var tag = document.createElement('span');
          tag.className = 'error-line-num';
          tag.textContent = 'L' + lineNum;
          row.appendChild(tag);
        }

        var msg = document.createElement('span');
        msg.textContent = humanized.message;
        row.appendChild(msg);
        item.appendChild(row);

        if (humanized.suggestion) {
          var tip = document.createElement('div');
          tip.className = 'error-suggestion';
          tip.textContent = '\\u2192 ' + humanized.suggestion;
          item.appendChild(tip);
        }

        validationResult.appendChild(item);
      });
      validationResult.style.display = 'block';
    }

    async function validateCode() {
      var yaml = codeEditor.value.trim();
      if (!yaml) {
        validationResult.className = 'validation-result invalid';
        validationResult.textContent = 'No YAML to validate';
        validationResult.style.display = 'block';
        return;
      }

      validateBtn.disabled = true;
      validateBtn.textContent = 'Validating...';

      try {
        var res = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ yaml: yaml })
        });
        var data = await res.json();

        if (data.valid) {
          validationResult.innerHTML = '';
          validationResult.className = 'validation-result valid';
          var header = document.createElement('div');
          header.className = 'validation-header';
          header.textContent = '\\u2713 Pipeline is valid';
          validationResult.appendChild(header);
        } else {
          var errors = data.errors || [];
          if (errors.length > 0) {
            displayErrors(errors, yaml, data.first_error);
          } else {
            validationResult.className = 'validation-result invalid';
            validationResult.textContent = '\\u2717 Pipeline has validation errors';
          }
        }
        validationResult.style.display = 'block';
      } catch (err) {
        validationResult.className = 'validation-result invalid';
        validationResult.textContent = 'Validation failed: ' + err.message;
        validationResult.style.display = 'block';
      } finally {
        validateBtn.disabled = false;
        validateBtn.textContent = 'Validate';
      }
    }

    function copyCode() {
      var codeToCopy = codeEditor.value.trim();
      if (codeToCopy) {
        navigator.clipboard.writeText(codeToCopy).then(function() {
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

        // Show validator errors elegantly if user said invalid and we agree
        if (!isValid && data.validatorResult && !data.validatorResult.valid) {
          var errors = data.validatorResult.errors || [];
          if (errors.length > 0) {
            displayErrors(errors, currentCode, null);
          }
        }

        // Track if validation passed for false positive reporting
        if (data.validatorResult && data.validatorResult.valid) {
          lastValidationPassed = true;
          lastValidatedYaml = currentCode;
        } else {
          lastValidationPassed = false;
          lastValidatedYaml = '';
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
      // Reset validation tracking for false positive reporting
      lastValidationPassed = false;
      lastValidatedYaml = '';
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

      // Parse markdown for assistant messages, plain text for user
      if (role === 'assistant') {
        div.appendChild(parseMarkdown(displayContent));
      } else {
        div.textContent = displayContent;
      }

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

      // Handle /new command
      if (message.toLowerCase() === '/new') {
        input.value = '';
        resetChat();
        return;
      }

      // Report false positive if validation passed but user is regenerating
      if (lastValidationPassed && lastValidatedYaml) {
        fetch('https://validate.expanso.io/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            yaml: lastValidatedYaml,
            expected_error: 'User regenerated after validation passed',
            context: 'mcp'
          })
        }).catch(function(err) {
          console.error('Failed to report false positive:', err);
        });
        // Reset tracking flags
        lastValidationPassed = false;
        lastValidatedYaml = '';
      }

      isLoading = true;
      sendBtn.disabled = true;
      input.value = '';
      lastUserMessage = message;

      addMessage(message, 'user');
      addLoading();

      try {
        // Include current YAML if user has edited it
        var currentYaml = codeEditor.value.trim();
        var payload = { message: message, history: history };
        if (currentYaml) {
          payload.currentYaml = currentYaml;
        }

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        removeLoading();

        if (data.error) {
          addMessage('Error: ' + data.error, 'assistant', []);
        } else {
          addMessage(data.response, 'assistant', data.sources || []);
          history.push({ role: 'user', content: message });
          history.push({ role: 'assistant', content: data.response });

          // If backend couldn't auto-correct, show validation errors
          if (data.validation && !data.validation.valid && data.validation.errors.length > 0) {
            var yaml = extractYaml(data.response);
            var firstError = data.validation.errors[0];
            displayErrors(data.validation.errors, yaml, firstError);
            validationResult.style.display = 'block';
          }
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

    // Load dynamic examples from API
    async function loadExamples() {
      var container = document.getElementById('examples');
      try {
        var res = await fetch('/api/examples');
        var data = await res.json();
        if (data.examples && data.examples.length > 0) {
          // Clear loading text
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          // Create buttons using safe DOM methods
          data.examples.forEach(function(ex) {
            var btn = document.createElement('button');
            btn.textContent = ex.name;
            btn.onclick = function() { askQuestion(ex.prompt); };
            container.appendChild(btn);
          });
        }
      } catch (err) {
        // Fallback to static examples on error
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        var fallbacks = [
          { name: 'Install Expanso', prompt: 'How do I install Expanso?' },
          { name: 'Pipeline components', prompt: 'What is a pipeline component?' },
          { name: 'Kafka to S3', prompt: 'Show me a Kafka to S3 pipeline' }
        ];
        fallbacks.forEach(function(ex) {
          var btn = document.createElement('button');
          btn.textContent = ex.name;
          btn.onclick = function() { askQuestion(ex.prompt); };
          container.appendChild(btn);
        });
      }
    }

    // Reset chat function
    function resetChat() {
      // Clear history
      history = [];
      currentCode = '';

      // Clear chat messages
      var chat = document.getElementById('chat');
      while (chat.firstChild) {
        chat.removeChild(chat.firstChild);
      }

      // Recreate welcome section
      var welcome = document.createElement('div');
      welcome.className = 'welcome';
      welcome.id = 'welcome';

      var h2 = document.createElement('h2');
      h2.textContent = 'Ask about Expanso';
      welcome.appendChild(h2);

      var p = document.createElement('p');
      p.textContent = 'Chat with our documentation. I can help you with pipelines, CLI commands, deployment, and more.';
      welcome.appendChild(p);

      var examples = document.createElement('div');
      examples.className = 'examples';
      examples.id = 'examples';
      var loading = document.createElement('span');
      loading.className = 'loading-text';
      loading.textContent = 'Loading examples...';
      examples.appendChild(loading);
      welcome.appendChild(examples);

      chat.appendChild(welcome);

      // Clear code panel
      codeContent.textContent = '// Your pipeline will appear here';
      feedbackButtons.style.display = 'none';
      hideFollowUpSuggestions();

      // Reload examples
      loadExamples();
      input.focus();
    }

    // New Chat button handler
    document.getElementById('newChatBtn').onclick = resetChat;

    loadExamples();
    input.focus();
  </script>
</body>
</html>`;
}

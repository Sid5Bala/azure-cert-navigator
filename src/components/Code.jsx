import { useState } from "react";
import { Icon } from "./ui.jsx";

// Minimal Python/shell tokenizer for readable snippets. Renders React spans only (no innerHTML).
const KEYWORDS = new Set("and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield".split(" "));
const TOKEN = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rbfu]{0,2}"(?:\\.|[^"\\\n])*"|[rbfu]{0,2}'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Za-z_][A-Za-z0-9_]*)/g;

function highlight(code) {
  const out = [];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [text, comment, str, num, call, word] = m;
    let cls = null;
    if (comment) cls = "tk-c";
    else if (str) cls = "tk-s";
    else if (num) cls = "tk-n";
    else if (call) cls = KEYWORDS.has(call) ? "tk-k" : "tk-f";
    else if (word) cls = KEYWORDS.has(word) ? "tk-k" : /^[A-Z]/.test(word) ? "tk-t" : null;
    out.push(cls ? <span key={m.index} className={cls}>{text}</span> : text);
    last = m.index + text.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn ghost sm code-copy"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        }
      }}
      aria-label={label}
    >
      <Icon name={done ? "check" : "copy"} size={14} /> {done ? "Copied" : label}
    </button>
  );
}

export function CodeBlock({ code, title, plain = false }) {
  return (
    <div className="code">
      {title && (
        <div className="code-head">
          <span>{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="code-body">
        <code>{plain ? code : highlight(code)}</code>
      </pre>
      {!title && <CopyButton text={code} />}
    </div>
  );
}

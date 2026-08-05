import React, { useState } from 'react';
import { Check, Copy, Code2, Download } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      c: 'c',
      cpp: 'cpp',
      csharp: 'cs',
      cs: 'cs',
      python: 'py',
      py: 'py',
      javascript: 'js',
      js: 'js',
      typescript: 'ts',
      ts: 'ts',
      tsx: 'tsx',
      jsx: 'jsx',
      rust: 'rs',
      rs: 'rs',
      go: 'go',
      java: 'java',
      kotlin: 'kt',
      swift: 'swift',
      html: 'html',
      css: 'css',
      sql: 'sql',
      json: 'json',
      sh: 'sh',
      bash: 'sh',
    };

    const cleanLang = (language || 'txt').toLowerCase();
    const ext = extMap[cleanLang] || cleanLang || 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waso_script.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayLanguage = (language || 'code').toUpperCase();

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#141419] overflow-hidden shadow-2xl group">
      {/* Header Bar matching C Editor Screenshot Aesthetic */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1c1c24] border-b border-white/10 text-xs font-mono text-cyan-300">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold tracking-wider text-slate-100 flex items-center gap-1">
            {displayLanguage}
            <span className="text-[11px] text-slate-400 font-mono">^</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 text-xs font-sans cursor-pointer"
            title="Download Code File"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-all border border-white/10 hover:border-cyan-500/40 text-xs font-sans cursor-pointer"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body with High-Contrast Syntax Highlighting matching attached reference image */}
      <div className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-slate-100 leading-relaxed bg-[#141419]">
        <pre className="m-0 whitespace-pre">
          <code>
            {code.split('\n').map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell select-none text-slate-600 pr-4 text-right text-[11px] font-mono">
                  {idx + 1}
                </span>
                <span className="table-cell">{renderColoredLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

/**
 * Tokenize line to apply precise colorful syntax highlighting matching reference screenshot:
 * - Keywords: Pink/Magenta (text-[#f472b6])
 * - Strings: Emerald Green (text-[#34d399])
 * - Comments: Muted Slate Gray (text-[#71717a] italic)
 * - Functions: Lavender/Blue (text-[#818cf8])
 * - Numbers: Amber (text-[#fbbf24])
 * - Preprocessor (#include, #define): Cyan (text-[#38bdf8])
 */
function renderColoredLine(line: string): React.ReactNode {
  if (!line) return '\n';

  // Comments check
  const commentIdx = line.indexOf('//');
  const hashCommentIdx = line.indexOf('#');

  // Single line comment starting with //
  if (commentIdx !== -1) {
    const codePart = line.substring(0, commentIdx);
    const commentPart = line.substring(commentIdx);
    return (
      <>
        {tokenizeCodePart(codePart)}
        <span className="text-[#71717a] italic">{commentPart}</span>
      </>
    );
  }

  // Python / Shell # comments (if not #include)
  if (hashCommentIdx !== -1 && !line.trim().startsWith('#include') && !line.trim().startsWith('#define')) {
    const codePart = line.substring(0, hashCommentIdx);
    const commentPart = line.substring(hashCommentIdx);
    return (
      <>
        {tokenizeCodePart(codePart)}
        <span className="text-[#71717a] italic">{commentPart}</span>
      </>
    );
  }

  return tokenizeCodePart(line);
}

function tokenizeCodePart(text: string): React.ReactNode {
  // Regex pattern matching strings, preprocessor, keywords, functions, numbers, operators
  const pattern = /(".*?"|'.*?'|`.*?`|#include\b|#define\b|\b(?:void|int|float|double|char|long|short|bool|boolean|string|struct|class|enum|interface|type|public|private|protected|static|final|const|let|var|function|fn|def|func|val|mut|auto|if|else|switch|case|default|break|continue|return|for|while|do|goto|try|catch|except|finally|throw|raise|import|export|from|include|using|namespace|package|super|this|self|new|delete|typeof|sizeof|instanceof|async|await|yield|in|of|as|match|impl|trait|where)\b|\b[a-zA-Z_]\w*(?=\s*\()|\b\d+(?:\.\d+)?\b|\b(?:true|false|NULL|null|nil|None)\b|[={}(),;+\-*\/%&|^!<>:]+)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <span key={`txt-${lastIndex}`} className="text-[#e4e4e7]">
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];
    const key = `tok-${match.index}`;

    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      // String -> Emerald Green
      elements.push(
        <span key={key} className="text-[#34d399] font-normal">
          {token}
        </span>
      );
    } else if (token === '#include' || token === '#define') {
      // Preprocessor -> Cyan
      elements.push(
        <span key={key} className="text-[#38bdf8] font-semibold">
          {token}
        </span>
      );
    } else if (
      /^(void|int|float|double|char|long|short|bool|boolean|string|struct|class|enum|interface|type|public|private|protected|static|final|const|let|var|function|fn|def|func|val|mut|auto|if|else|switch|case|default|break|continue|return|for|while|do|goto|try|catch|except|finally|throw|raise|import|export|from|include|using|namespace|package|super|this|self|new|delete|typeof|sizeof|instanceof|async|await|yield|in|of|as|match|impl|trait|where)$/.test(
        token
      )
    ) {
      // Keywords -> Pink / Magenta (matching image)
      elements.push(
        <span key={key} className="text-[#f472b6] font-semibold">
          {token}
        </span>
      );
    } else if (/^\d+(\.\d+)?$/.test(token) || /^(true|false|NULL|null|nil|None)$/.test(token)) {
      // Numbers & Booleans -> Amber
      elements.push(
        <span key={key} className="text-[#fbbf24]">
          {token}
        </span>
      );
    } else if (/^[={}(),;+\-*\/%&|^!<>:]+$/.test(token)) {
      // Operators & Brackets -> Soft Pink / Slate
      elements.push(
        <span key={key} className="text-[#f472b6]">
          {token}
        </span>
      );
    } else {
      // Function Calls / Identifiers -> Lavender / Blue
      elements.push(
        <span key={key} className="text-[#818cf8]">
          {token}
        </span>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(
      <span key={`txt-${lastIndex}`} className="text-[#e4e4e7]">
        {text.substring(lastIndex)}
      </span>
    );
  }

  return elements;
}

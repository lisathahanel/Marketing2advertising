import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RotateCw,
  Search,
  Copy,
  Check,
  Download,
  Play,
  Grid,
} from 'lucide-react';
import { AppTool } from '../../types';
import { AdMobBanner } from '../AdMobBanner';
import { showToast } from '../Toast';

interface AppsScreenProps {
  apps: AppTool[];
  onTriggerAd?: () => void;
}

export const AppsScreen: React.FC<AppsScreenProps> = ({ apps, onTriggerAd }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentApp, setCurrentApp] = useState<AppTool | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Filter categories matching website
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'create', label: 'Create' },
    { id: 'media', label: 'Media' },
    { id: 'text', label: 'Text' },
    { id: 'dev', label: 'Dev' },
    { id: 'daily', label: 'Daily' },
  ];

  const handleSelectApp = (app: AppTool) => {
    setCurrentApp(app);
    if (onTriggerAd && Math.random() > 0.6) {
      onTriggerAd();
    }
  };

  const handleBackToApps = () => {
    setCurrentApp(null);
  };

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredApps = apps.filter((a) => {
    const matchesCat = activeCategory === 'all' || a.cat.toLowerCase() === activeCategory.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Render individual tool view
  const renderToolBody = (tool: AppTool) => {
    switch (tool.id) {
      case 'calc':
        return <CalculatorTool key={reloadKey} />;
      case 'pass':
        return <PasswordGeneratorTool key={reloadKey} />;
      case 'qr':
        return <QRCodeTool key={reloadKey} />;
      case 'word':
        return <WordCounterTool key={reloadKey} />;
      case 'case':
        return <CaseConverterTool key={reloadKey} />;
      case 'pdf':
        return <TextToPdfTool key={reloadKey} />;
      case 'video':
        return <VideoPlayerTool key={reloadKey} />;
      case 'html':
        return <HtmlEditorTool key={reloadKey} />;
      case 'base64':
        return <Base64Tool key={reloadKey} />;
      case 'json':
        return <JsonFormatterTool key={reloadKey} />;
      case 'url':
        return <UrlEncoderTool key={reloadKey} />;
      case 'color':
        return <ColorPickerTool key={reloadKey} />;
      case 'note':
        return <QuickNotesTool key={reloadKey} />;
      case 'timer':
        return <TimerTool key={reloadKey} />;
      case 'age':
        return <AgeCalculatorTool key={reloadKey} />;
      case 'lorem':
        return <LoremIpsumTool key={reloadKey} />;
      case 'unit':
        return <UnitConverterTool key={reloadKey} />;
      case 'device':
        return <DeviceViewerTool key={reloadKey} />;
      case 'gif':
        return <GifMakerTool key={reloadKey} />;
      default:
        return (
          <div className="p-6 text-center text-slate-400">
            <p>Tool {tool.name} is ready.</p>
          </div>
        );
    }
  };

  return (
    <div className="pb-28 max-w-xl mx-auto px-3.5 space-y-4 animate-in fade-in duration-300">
      {/* Active Tool View */}
      {currentApp ? (
        <div className="space-y-3">
          {/* Toolbar matching site */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-[#14141e] border border-white/5">
            <button
              onClick={handleBackToApps}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 hover:text-amber-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← All apps</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400">{currentApp.name}</span>
              <button
                onClick={handleReload}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 hover:text-amber-400 transition"
                title="Reload tool"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>↻ Reload</span>
              </button>
            </div>
          </div>

          {/* Tool Container */}
          <div className="rounded-3xl bg-[#14141e] border border-white/10 p-4 sm:p-5 shadow-2xl">
            {renderToolBody(currentApp)}
          </div>

          {/* AdMob Banner Slot */}
          <AdMobBanner format="banner" />
        </div>
      ) : (
        /* Apps Catalog View */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Multi <span className="text-amber-400">Apps</span>
              </h2>
              <p className="text-xs text-slate-400">Free tools · no sign-up · open instantly</p>
            </div>
            <span className="text-xs font-bold text-amber-400/90 font-mono">
              {filteredApps.length} apps available
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps…"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#14141e] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => {
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-[#14141e] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* AdMob Banner Slot */}
          <AdMobBanner format="banner" />

          {/* Apps Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredApps.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleSelectApp(tool)}
                className="group p-4 rounded-2xl bg-[#14141e] border border-white/5 hover:border-amber-500/40 text-center transition flex flex-col items-center justify-between min-h-[140px] active:scale-95 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#1c1c28] border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition shadow-inner">
                  {tool.ico}
                </div>
                <div className="mt-2 w-full">
                  <h4 className="text-xs font-black text-white group-hover:text-amber-400 truncate">
                    {tool.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{tool.desc}</p>
                </div>
                <span className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 text-slate-400 group-hover:bg-amber-500/20 group-hover:text-amber-300">
                  {tool.cat}
                </span>
              </button>
            ))}
          </div>

          {filteredApps.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-[#14141e] border border-white/5">
              <p className="text-xs text-slate-400">No apps found matching "{searchQuery}"</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-2 text-xs font-bold text-amber-400"
              >
                Reset filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ===== INDIVIDUAL TOOL IMPLEMENTATIONS ===== */

// 1. Calculator Tool
const CalculatorTool: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [formula, setFormula] = useState('');

  const handleBtn = (val: string) => {
    if (val === 'C') {
      setDisplay('0');
      setFormula('');
    } else if (val === '=') {
      try {
        const clean = formula.replace(/×/g, '*').replace(/÷/g, '/');
        // evaluate safely
        const res = Function(`"use strict"; return (${clean});`)();
        setDisplay(String(res));
        setFormula(String(res));
      } catch {
        setDisplay('Error');
      }
    } else if (['+', '-', '×', '÷'].includes(val)) {
      setFormula((prev) => prev + ' ' + val + ' ');
      setDisplay(val);
    } else {
      setDisplay((prev) => (prev === '0' || ['+', '-', '×', '÷'].includes(prev) ? val : prev + val));
      setFormula((prev) => prev + val);
    }
  };

  const keys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '='];

  return (
    <div className="max-w-xs mx-auto space-y-3">
      <div className="p-4 rounded-2xl bg-black border border-white/10 text-right">
        <div className="text-[11px] text-slate-400 h-4 font-mono truncate">{formula || '0'}</div>
        <div className="text-2xl font-black text-white font-mono mt-1">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => handleBtn(k)}
            className={`h-11 rounded-xl font-bold text-sm transition active:scale-90 ${
              k === '='
                ? 'bg-amber-500 text-black font-black'
                : k === 'C'
                ? 'bg-rose-600/30 text-rose-400 border border-rose-500/30'
                : ['÷', '×', '-', '+'].includes(k)
                ? 'bg-white/15 text-amber-400'
                : 'bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
};

// 2. Password Generator Tool
const PasswordGeneratorTool: React.FC = () => {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  useEffect(() => {
    generate();
  }, [length, uppercase, numbers, symbols]);

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <div className="p-3.5 rounded-2xl bg-black border border-white/10 flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-amber-300 font-bold truncate">{password}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <div className="flex justify-between text-slate-400 mb-1 font-semibold">
            <span>Password Length</span>
            <span className="text-amber-400 font-bold">{length}</span>
          </div>
          <input
            type="range"
            min="8"
            max="32"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="accent-amber-500"
            />
            <span>A-Z</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={numbers}
              onChange={(e) => setNumbers(e.target.checked)}
              className="accent-amber-500"
            />
            <span>0-9</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={symbols}
              onChange={(e) => setSymbols(e.target.checked)}
              className="accent-amber-500"
            />
            <span>!@#</span>
          </label>
        </div>

        <button
          onClick={generate}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition"
        >
          Generate New Password
        </button>
      </div>
    </div>
  );
};

// 3. QR Code Generator Tool
const QRCodeTool: React.FC = () => {
  const [text, setText] = useState('https://www.marketing2advertising.com');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}&bgcolor=14-14-1e&color=eab308`;

  return (
    <div className="space-y-4 max-w-sm mx-auto text-center">
      <div className="w-52 h-52 mx-auto rounded-2xl bg-[#0b0b0f] border border-amber-500/30 p-3 flex items-center justify-center shadow-lg">
        <img src={qrUrl} alt="Generated QR" className="w-full h-full object-contain rounded-xl" />
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text or URL to generate QR…"
        className="w-full h-11 px-3.5 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
      />

      <a
        href={qrUrl}
        download="m2a_qr_code.png"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Download QR Code</span>
      </a>
    </div>
  );
};

// 4. Word Counter Tool
const WordCounterTool: React.FC = () => {
  const [text, setText] = useState('');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const readingTime = Math.ceil(words / 200);

  return (
    <div className="space-y-3 max-w-sm mx-auto">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-black border border-white/10">
          <div className="text-base font-black text-amber-400">{words}</div>
          <div className="text-[10px] text-slate-400">Words</div>
        </div>
        <div className="p-2.5 rounded-xl bg-black border border-white/10">
          <div className="text-base font-black text-white">{chars}</div>
          <div className="text-[10px] text-slate-400">Chars</div>
        </div>
        <div className="p-2.5 rounded-xl bg-black border border-white/10">
          <div className="text-base font-black text-white">{charsNoSpaces}</div>
          <div className="text-[10px] text-slate-400">No Space</div>
        </div>
        <div className="p-2.5 rounded-xl bg-black border border-white/10">
          <div className="text-base font-black text-amber-400">{readingTime}m</div>
          <div className="text-[10px] text-slate-400">Read Time</div>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste text here to count words, characters, and reading time…"
        className="w-full h-40 p-3 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
      />
    </div>
  );
};

// 5. Case Converter Tool
const CaseConverterTool: React.FC = () => {
  const [text, setText] = useState('Transform your text with M2A free case tools');

  const upper = text.toUpperCase();
  const lower = text.toLowerCase();
  const title = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  const snake = text.trim().toLowerCase().replace(/\s+/g, '_');
  const kebab = text.trim().toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-3 max-w-sm mx-auto">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-24 p-3 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
      />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          onClick={() => setText(upper)}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-slate-200"
        >
          UPPERCASE
        </button>
        <button
          onClick={() => setText(lower)}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-slate-200"
        >
          lowercase
        </button>
        <button
          onClick={() => setText(title)}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-slate-200"
        >
          Title Case
        </button>
        <button
          onClick={() => setText(snake)}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-slate-200"
        >
          snake_case
        </button>
        <button
          onClick={() => setText(kebab)}
          className="col-span-2 p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-black"
        >
          kebab-case
        </button>
      </div>
    </div>
  );
};

// 6. Text to PDF Tool
const TextToPdfTool: React.FC = () => {
  const [title, setTitle] = useState('Document Title');
  const [body, setBody] = useState('Type your document content here. You can print or save as PDF.');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { border-bottom: 2px solid #e11d48; padding-bottom: 8px; }
            p { white-space: pre-wrap; font-size: 15px; }
            footer { margin-top: 60px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>${body}</p>
          <footer>Generated via M2A Digital Apps · marketing2advertising.com</footer>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-3 max-w-sm mx-auto">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document Title"
        className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-xs text-white"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full h-36 p-3 rounded-xl bg-black border border-white/10 text-xs text-white"
      />
      <button
        onClick={handlePrint}
        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        <span>Export / Print as PDF</span>
      </button>
    </div>
  );
};

// 7. Video Player Tool
const VideoPlayerTool: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  const [activeUrl, setActiveUrl] = useState(videoUrl);

  return (
    <div className="space-y-3 max-w-sm mx-auto">
      <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden border border-white/10">
        <video src={activeUrl} controls className="w-full h-full object-contain" />
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Enter MP4 or video URL…"
          className="flex-1 h-10 px-3 rounded-xl bg-black border border-white/10 text-xs text-white"
        />
        <button
          onClick={() => setActiveUrl(videoUrl)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black"
        >
          Load
        </button>
      </div>
    </div>
  );
};

// 8. HTML Editor Tool
const HtmlEditorTool: React.FC = () => {
  const [htmlCode, setHtmlCode] = useState(
    `<div style="text-align:center;padding:20px;font-family:sans-serif;color:#333;">\n  <h2 style="color:#e11d48">Hello from M2A!</h2>\n  <p>Live HTML preview in real-time.</p>\n  <button style="background:#f59e0b;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer">Interactive Button</button>\n</div>`
  );

  return (
    <div className="space-y-3 max-w-sm mx-auto">
      <textarea
        value={htmlCode}
        onChange={(e) => setHtmlCode(e.target.value)}
        className="w-full h-32 p-3 rounded-xl bg-black border border-white/10 text-xs font-mono text-emerald-400"
      />
      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Preview</div>
      <iframe
        srcDoc={htmlCode}
        title="Live HTML Editor"
        className="w-full h-44 rounded-xl bg-white border border-white/10"
      />
    </div>
  );
};

// 9. Base64 Tool
const Base64Tool: React.FC = () => {
  const [input, setInput] = useState('Marketing2Advertising');
  const [output, setOutput] = useState('');

  const encode = () => {
    try {
      setOutput(btoa(input));
    } catch {
      setOutput('Encoding error');
    }
  };

  const decode = () => {
    try {
      setOutput(atob(input));
    } catch {
      setOutput('Invalid base64 string');
    }
  };

  useEffect(() => {
    encode();
  }, []);

  return (
    <div className="space-y-3 max-w-sm mx-auto text-xs">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter text to encode/decode…"
        className="w-full h-24 p-3 rounded-xl bg-black border border-white/10 text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={encode}
          className="py-2 rounded-xl bg-amber-500 text-black font-bold"
        >
          Encode Base64
        </button>
        <button
          onClick={decode}
          className="py-2 rounded-xl bg-white/10 text-white font-bold"
        >
          Decode Base64
        </button>
      </div>
      <div className="p-3 rounded-xl bg-black border border-white/10 font-mono text-[11px] text-amber-300 break-all min-h-[50px]">
        {output}
      </div>
    </div>
  );
};

// 10. JSON Formatter Tool
const JsonFormatterTool: React.FC = () => {
  const [input, setInput] = useState('{"m2a":{"name":"M2A Digital","version":2,"channels":19,"free":true}}');
  const [output, setOutput] = useState('');

  const format = () => {
    try {
      const obj = JSON.parse(input);
      setOutput(JSON.stringify(obj, null, 2));
    } catch (e) {
      setOutput(`Syntax Error: ${(e as Error).message}`);
    }
  };

  const minify = () => {
    try {
      const obj = JSON.parse(input);
      setOutput(JSON.stringify(obj));
    } catch (e) {
      setOutput(`Syntax Error: ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    format();
  }, []);

  return (
    <div className="space-y-3 max-w-sm mx-auto text-xs">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full h-24 p-3 rounded-xl bg-black border border-white/10 font-mono text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={format} className="py-2 rounded-xl bg-amber-500 text-black font-bold">
          Beautify JSON
        </button>
        <button onClick={minify} className="py-2 rounded-xl bg-white/10 text-white font-bold">
          Minify
        </button>
      </div>
      <pre className="p-3 rounded-xl bg-black border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48">
        {output}
      </pre>
    </div>
  );
};

// 11. URL Encoder Tool
const UrlEncoderTool: React.FC = () => {
  const [input, setInput] = useState('https://www.marketing2advertising.com?category=AI Tools&ref=mobile app');
  const [encoded, setEncoded] = useState('');

  useEffect(() => {
    setEncoded(encodeURIComponent(input));
  }, [input]);

  return (
    <div className="space-y-3 max-w-sm mx-auto text-xs">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-white"
      />
      <div className="p-3 rounded-xl bg-black border border-white/10 font-mono text-[11px] text-amber-300 break-all">
        {encoded}
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(encoded)}
        className="w-full py-2 rounded-xl bg-amber-500 text-black font-bold"
      >
        Copy Encoded URL
      </button>
    </div>
  );
};

// 12. Color Picker Tool
const ColorPickerTool: React.FC = () => {
  const [color, setColor] = useState('#f59e0b');

  return (
    <div className="space-y-4 max-w-sm mx-auto text-center">
      <div
        className="w-28 h-28 mx-auto rounded-3xl border-2 border-white/20 shadow-xl transition"
        style={{ backgroundColor: color }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-20 h-10 rounded-xl bg-transparent cursor-pointer"
      />
      <div className="p-3 rounded-xl bg-black border border-white/10 font-mono text-sm text-white font-bold">
        HEX: <span className="text-amber-400">{color.toUpperCase()}</span>
      </div>
    </div>
  );
};

// 13. Quick Notes Tool
const QuickNotesTool: React.FC = () => {
  const [note, setNote] = useState(() => localStorage.getItem('m2a_quick_notes') || '');

  const handleChange = (val: string) => {
    setNote(val);
    localStorage.setItem('m2a_quick_notes', val);
  };

  return (
    <div className="space-y-3 max-w-sm mx-auto">
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>Auto-saved to device storage</span>
        <button
          onClick={() => handleChange('')}
          className="text-rose-400 hover:text-rose-300"
        >
          Clear
        </button>
      </div>
      <textarea
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Jot down quick thoughts, code snippets, or links here…"
        className="w-full h-44 p-3 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
      />
    </div>
  );
};

// 14. Timer & Stopwatch Tool
const TimerTool: React.FC = () => {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running && seconds > 0) {
      interval = setInterval(() => setSeconds((s) => s - 1), 1000);
    } else if (seconds === 0 && running) {
      setRunning(false);
      showToast('M2A Timer Finished!', 'success');
    }
    return () => clearInterval(interval);
  }, [running, seconds]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="space-y-4 max-w-sm mx-auto text-center">
      <div className="text-5xl font-mono font-black text-amber-400 py-4">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setRunning(!running)}
          className={`px-6 py-2.5 rounded-xl font-black text-xs ${
            running ? 'bg-rose-600 text-white' : 'bg-amber-500 text-black'
          }`}
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setSeconds(60);
          }}
          className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs"
        >
          Reset (1m)
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setSeconds(300);
          }}
          className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs"
        >
          5m
        </button>
      </div>
    </div>
  );
};

// 15. Age Calculator Tool
const AgeCalculatorTool: React.FC = () => {
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [res, setRes] = useState('');

  const calc = () => {
    const birth = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      days += 30;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    setRes(`${years} Years, ${months} Months, ${days} Days old`);
  };

  useEffect(() => {
    calc();
  }, [birthDate]);

  return (
    <div className="space-y-4 max-w-sm mx-auto text-center">
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className="w-full h-11 px-3 rounded-xl bg-black border border-white/10 text-xs text-white"
      />
      <div className="p-4 rounded-2xl bg-black border border-amber-500/30 text-amber-300 font-bold text-sm">
        {res}
      </div>
    </div>
  );
};

// 16. Lorem Ipsum Tool
const LoremIpsumTool: React.FC = () => {
  const [paras, setParas] = useState(2);
  const sample =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';

  return (
    <div className="space-y-3 max-w-sm mx-auto text-xs">
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Number of paragraphs</span>
        <div className="flex gap-1">
          {[1, 2, 3, 5].map((p) => (
            <button
              key={p}
              onClick={() => setParas(p)}
              className={`px-2.5 py-1 rounded-lg font-bold ${
                paras === p ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 rounded-xl bg-black border border-white/10 text-slate-300 max-h-48 overflow-y-auto space-y-2">
        {Array.from({ length: paras }).map((_, i) => (
          <p key={i}>{sample}</p>
        ))}
      </div>
    </div>
  );
};

// 17. Unit Converter Tool
const UnitConverterTool: React.FC = () => {
  const [meters, setMeters] = useState(10);
  const feet = (meters * 3.28084).toFixed(2);
  const miles = (meters * 0.000621371).toFixed(4);
  const inches = (meters * 39.3701).toFixed(1);

  return (
    <div className="space-y-3 max-w-sm mx-auto text-xs">
      <div className="text-slate-400 mb-1 font-semibold">Length Converter (Meters)</div>
      <input
        type="number"
        value={meters}
        onChange={(e) => setMeters(Number(e.target.value))}
        className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-white"
      />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-black border border-white/10">
          <div className="font-black text-amber-400">{feet}</div>
          <div className="text-[10px] text-slate-400">Feet</div>
        </div>
        <div className="p-2.5 rounded-xl bg-black border border-white/10">
          <div className="font-black text-white">{miles}</div>
          <div className="text-[10px] text-slate-400">Miles</div>
        </div>
        <div className="p-2.5 rounded-xl bg-black border border-white/10">
          <div className="font-black text-white">{inches}</div>
          <div className="text-[10px] text-slate-400">Inches</div>
        </div>
      </div>
    </div>
  );
};

// 18. Device Viewer Tool
const DeviceViewerTool: React.FC = () => {
  const [device, setDevice] = useState<'mobile' | 'tablet'>('mobile');
  return (
    <div className="space-y-3 text-center text-xs">
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setDevice('mobile')}
          className={`px-3 py-1.5 rounded-xl font-bold ${
            device === 'mobile' ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'
          }`}
        >
          Mobile (375px)
        </button>
        <button
          onClick={() => setDevice('tablet')}
          className={`px-3 py-1.5 rounded-xl font-bold ${
            device === 'tablet' ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'
          }`}
        >
          Tablet (768px)
        </button>
      </div>
      <div className="overflow-x-auto p-2 bg-black rounded-2xl border border-white/10 flex justify-center">
        <iframe
          src="https://www.marketing2advertising.com"
          title="Device frame preview"
          style={{ width: device === 'mobile' ? '375px' : '768px', height: '420px' }}
          className="rounded-xl border border-white/20 bg-white"
        />
      </div>
    </div>
  );
};

// 19. GIF Maker Tool
const GifMakerTool: React.FC = () => {
  const [frames, setFrames] = useState<string[]>([
    '🔥 M2A DIGITAL',
    '⚡ LIVE CHANNELS',
    '🚀 15 FREE GAMES',
    '✨ 19 MULTI APPS'
  ]);
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % frames.length);
    }, 600);
    return () => clearInterval(timer);
  }, [frames]);

  return (
    <div className="space-y-4 max-w-sm mx-auto text-center text-xs">
      <div className="w-56 h-36 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center p-4 shadow-xl">
        <span className="text-lg font-black text-white font-mono tracking-wider drop-shadow">
          {frames[frameIdx]}
        </span>
      </div>
      <p className="text-slate-400 text-[11px]">Dynamic animated frame simulation engine</p>
    </div>
  );
};

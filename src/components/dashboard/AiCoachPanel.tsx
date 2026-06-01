import React, { useState, useMemo, useEffect } from 'react';
import { useTrades } from '../../context/TradeContext';
import { analyzeTradingHistory } from '../../utils/coachEngine';
import { Card } from '../ui/Card';
import { 
  Bot, 
  Sparkles, 
  Key, 
  Brain, 
  FileDown, 
  Loader2, 
  X,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, cn, calculateTradingStats } from '../../utils/helpers';

export const AiCoachPanel: React.FC = () => {
  const { trades, stats, userProfile } = useTrades();

  // Heuristic report fallback
  const localReport = useMemo(() => {
    return analyzeTradingHistory(trades, userProfile.currency);
  }, [trades, userProfile.currency]);

  // States
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [geminiReport, setGeminiReport] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportPeriod, setExportPeriod] = useState<'7' | '30' | '90' | 'all'>('30');
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json' | 'txt'>('markdown');

  // Load API key and cached analysis on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('vasu_gemini_key') || '';
    setApiKey(savedKey);
    const cachedAnalysis = localStorage.getItem('vasu_gemini_analysis') || '';
    if (cachedAnalysis) {
      setGeminiReport(cachedAnalysis);
    }
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('vasu_gemini_key', apiKey.trim());
    setShowKeyInput(false);
  };

  const handleClearKey = () => {
    setApiKey('');
    localStorage.removeItem('vasu_gemini_key');
    localStorage.removeItem('vasu_gemini_analysis');
    setGeminiReport('');
  };

  // Compile trade logs for prompt context
  const getPromptContext = () => {
    const closed = trades.filter(t => t.status === 'Closed');
    const logsText = closed.map((t, idx) => (
      `${idx + 1}. Date: ${t.date} ${t.time} | Instrument: ${t.instrument} | Side: ${t.side} | PnL: ${t.pnl} | ROI: ${t.roi}% | Mistakes: ${(t.mistakes || []).join(', ') || 'None'} | Strategy: ${t.strategy} | Notes: ${t.notes || 'None'}`
    )).join('\n');

    return `
You are the elite AI Trading Coach inside RiskyVasu, a highly disciplined invite-only trading journal platform.
Analyze the following trading journal data and generate a detailed tactical and psychological performance diagnostic report.

### TRADING METRICS
- Total Trades: ${stats.totalTrades}
- Win Rate: ${stats.winRate.toFixed(1)}%
- Profit Factor: ${stats.profitFactor.toFixed(2)}
- Total Net Profit: ${formatCurrency(stats.totalPnL, userProfile.currency)}
- Discipline Score: ${stats.disciplineScore}/100
- Risk Score: ${stats.riskScore}/100
- Psychology Score: ${stats.psychologyScore}/100
- Execution Score: ${stats.executionScore}/100
- Overall Rating: ${stats.overallScore}/100

### RECENT EXECUTION JOURNAL LOGS
${logsText || 'No closed trades recorded yet.'}

### OBJECTIVE
Diagnose recurring behavioral mistakes, position sizing inconsistencies, rule breaks, and emotional errors (like FOMO, Revenge Trading). Suggest concrete discipline parameters, Kelly Criterion risk limits, psychological exercises, and rules to optimize PnL expectation.

### FORMAT
Respond in a clean, highly structured, encouraging markdown format featuring:
- **### Heuristic Risk & Psychological Audit**: Detailed critique of emotional behaviors and rules compliance.
- **### Edge & Strategy Performance**: Identify what is working and what is leaking.
- **### Tactical Sizing Guidelines (Kelly Criterion)**: Practical sizing limits.
- **### Heuristic Action Priorities**: A 3-step action items plan.
Keep it strictly technical, direct, and actionable. Do not use generic placeholders.
`;
  };

  // Call Google AI Studio (Gemini 1.5 Flash API)
  const handleGeminiAnalyze = async () => {
    if (!apiKey.trim()) {
      setShowKeyInput(true);
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage('');
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: getPromptContext(),
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate content from Gemini API.');
      }

      const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reportText) {
        setGeminiReport(reportText);
        localStorage.setItem('vasu_gemini_analysis', reportText);
      } else {
        throw new Error('Empty response received from AI model.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Check your internet connection or Google AI Studio API Key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format reports simply for display
  const renderReportHtml = (markdownContent: string) => {
    return markdownContent
      .split('\n')
      .map((line, idx) => {
        let trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          return <h3 key={idx} className="text-sm font-extrabold text-zinc-100 font-display mt-4 mb-2 uppercase tracking-wide flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-indigo-400" />{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith('#### ')) {
          return <h4 key={idx} className="text-xs font-bold text-zinc-200 font-display mt-3 mb-1.5 uppercase tracking-wide">{trimmed.slice(5)}</h4>;
        }
        if (trimmed.startsWith('- ')) {
          let content = trimmed.slice(2);
          
          let bulletColor = "bg-zinc-500";
          if (content.includes('🟢') || content.includes('🏆') || content.includes('Win')) bulletColor = "bg-emerald-400";
          if (content.includes('🔴') || content.includes('⚠️') || content.includes('Loss') || content.includes('FOMO') || content.includes('Revenge')) bulletColor = "bg-rose-500";
          if (content.includes('📊') || content.includes('📅') || content.includes('Score')) bulletColor = "bg-indigo-400";

          const boldMatch = content.match(/\*\*(.*?)\*\*/g);
          let nodes: React.ReactNode = content;
          if (boldMatch) {
            let parts = content.split(/\*\*.*?\*\*/);
            let boldTexts = boldMatch.map(m => m.replace(/\*\*/g, ''));
            nodes = (
              <span>
                {parts.map((p, pIdx) => (
                  <React.Fragment key={pIdx}>
                    {p}
                    {boldTexts[pIdx] && <strong className="text-zinc-100 font-semibold">{boldTexts[pIdx]}</strong>}
                  </React.Fragment>
                ))}
              </span>
            );
          }

          return (
            <div key={idx} className="flex items-start gap-2.5 my-2 text-xs text-zinc-300 leading-relaxed pl-1">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${bulletColor}`} />
              <span>{nodes}</span>
            </div>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} className="p-3 my-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 leading-relaxed italic">
              {trimmed.slice(2)}
            </div>
          );
        }
        if (trimmed === '') return null;
        return <p key={idx} className="text-xs text-zinc-400 my-1 leading-relaxed">{line}</p>;
      })
      .filter(Boolean);
  };

  const activeReportContent = geminiReport || localReport.summary;

  // Handle generating and exporting AI Prompt analysis files
  const handleExportAiFile = () => {
    const daysLimit = exportPeriod === '7' ? 7 : exportPeriod === '30' ? 30 : exportPeriod === '90' ? 90 : 99999;
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - daysLimit);
    const limitStr = limitDate.toISOString().substring(0, 10);

    const relevantTrades = trades.filter(t => t.status === 'Closed' && (exportPeriod === 'all' || t.date >= limitStr));
    const periodStats = calculateTradingStats(relevantTrades);

    // Build markdown structured text
    let exportText = `# RiskyVasu AI Analysis Profile - ${new Date().toLocaleDateString()}\n\n`;
    exportText += `## Operational Profile Summary\n`;
    exportText += `- Username: ${userProfile.username}\n`;
    exportText += `- Export Period: Last ${exportPeriod} Days\n`;
    exportText += `- Overall Desk Rating: ${periodStats.overallScore}/100\n`;
    exportText += `- Discipline Compliance: ${periodStats.disciplineScore}/100\n`;
    exportText += `- Sizing & Risk Rating: ${periodStats.riskScore}/100\n`;
    exportText += `- Psychological Stability: ${periodStats.psychologyScore}/100\n`;
    exportText += `- Win Ratio: ${periodStats.winRate.toFixed(1)}%\n`;
    exportText += `- Expected expectancy: ${periodStats.totalPnL.toFixed(2)} ${userProfile.currency}\n\n`;

    exportText += `## Behavioral & Execution Log details\n`;
    relevantTrades.forEach((t, idx) => {
      exportText += `### Trade #${idx + 1}: ${t.instrument} [${t.side}]\n`;
      exportText += `- Execution Date: ${t.date} ${t.time}\n`;
      exportText += `- Entry Price: ${t.entryPrice} | Exit Price: ${t.exitPrice}\n`;
      exportText += `- Stop Loss: ${t.stopLoss || 'None'} | Take Profit: ${t.takeProfit || 'None'}\n`;
      exportText += `- Quantity: ${t.quantity} | Fees: ${t.fees}\n`;
      exportText += `- Outcome Net PnL: ${t.pnl} | ROI: ${t.roi}%\n`;
      exportText += `- Mistakes Tagged: ${(t.mistakes || []).join(', ') || 'None'}\n`;
      exportText += `- Execution Strategy: ${t.strategy}\n`;
      exportText += `- Trader Notes: ${t.notes || 'None'}\n`;
      if (t.screenshotUrl) exportText += `- Attached Chart URL: ${t.screenshotUrl}\n`;
      exportText += `\n`;
    });

    exportText += `## AI Diagnostic Guidelines\n`;
    exportText += `Use the above trading data to examine position scaling mistakes, revenge triggers, psychological traps, FOMO patterns, and overall edge expectation parameters. Recommend action rules to improve structural win expectations.`;

    let fileContent = '';
    let fileName = `riskyvasu_ai_export_${exportPeriod}d`;

    if (exportFormat === 'json') {
      fileContent = JSON.stringify({
        profile: {
          username: userProfile.username,
          currency: userProfile.currency,
          stats: periodStats,
        },
        executions: relevantTrades,
      }, null, 2);
      fileName += '.json';
    } else if (exportFormat === 'txt') {
      fileContent = exportText.replace(/#/g, '');
      fileName += '.txt';
    } else {
      fileContent = exportText;
      fileName += '.md';
    }

    // Trigger file download browser prompt
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between w-full text-indigo-400">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 animate-pulse" />
            <span>AI Trading Coach Diagnostics</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              title="Configure API Key"
              className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors select-none"
            >
              <Key className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              title="Generate AI Analysis File"
              className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors select-none"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      }
      subtitle="Interactive psychological diagnostics using Google AI Studio API"
      className="text-left"
    >
      <div className="space-y-4">
        {/* API Key configure slider */}
        {showKeyInput && (
          <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Google AI Studio API Key</span>
              {apiKey && (
                <button onClick={handleClearKey} className="text-[8px] font-bold text-rose-500 hover:text-rose-400 uppercase tracking-widest cursor-pointer select-none">
                  Reset Key
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={handleSaveKey}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider select-none"
              >
                Save
              </button>
            </div>
            <span className="text-[8px] text-zinc-500 block leading-normal">
              Keys are stored securely inside your local browser storage and used only to query Gemini.
            </span>
          </div>
        )}

        {/* Display Error notifications */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Gemini Analysis Failure</p>
              <p className="text-[10px] leading-relaxed text-rose-500">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Display markdown content */}
        <div className="space-y-1 bg-zinc-950 p-4 rounded-xl border border-zinc-900 overflow-hidden relative">
          <div className="max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {renderReportHtml(activeReportContent)}
          </div>

          {/* Prompt trigger overlay */}
          {trades.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                {geminiReport ? "sync_gemini_active" : "sync_heuristic_active"}
              </span>
              <button
                onClick={handleGeminiAnalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-all select-none disabled:opacity-40"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-3 w-3" />
                    <span>{apiKey ? "Analyze with Gemini" : "Activate Gemini"}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Local report stats strip (Bottom) */}
        {trades.length > 0 && !geminiReport && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800/80 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display">Heuristic Strategy Edge</span>
                <span className="text-xs font-bold text-emerald-400 block mt-1.5 font-display">
                  {localReport.edgeSetup}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800/80 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display">Tactical Action Priority</span>
                <span className="text-xs font-bold text-zinc-200 block mt-1.5 font-display">
                  {localReport.tacticalAction}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AI Export Dialog Overlay */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <span className="text-xs font-extrabold text-zinc-200 font-display uppercase tracking-wider">Generate AI Analysis File</span>
                <button onClick={() => setShowExportModal(false)} className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Time period options */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Log Timeframe</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '7', label: 'Last 7 Days' },
                    { value: '30', label: 'Last 30 Days' },
                    { value: '90', label: 'Last 90 Days' },
                    { value: 'all', label: 'All Time' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExportPeriod(opt.value as any)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all uppercase tracking-wider text-center select-none",
                        exportPeriod === opt.value
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : "bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export format options */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">File Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'markdown', label: 'Markdown' },
                    { value: 'json', label: 'JSON' },
                    { value: 'txt', label: 'Plain TXT' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExportFormat(opt.value as any)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all uppercase tracking-wider text-center select-none",
                        exportFormat === opt.value
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : "bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-zinc-400 border border-zinc-800 bg-zinc-900 hover:bg-zinc-900/80 transition-colors select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportAiFile}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-indigo select-none"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Download File</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

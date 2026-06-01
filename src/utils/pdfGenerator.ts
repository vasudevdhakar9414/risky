import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Trade, UserProfile } from '../types';
import { calculateTradingStats, formatCurrency, formatPercent } from './helpers';

/**
 * Generates and downloads a premium PDF report of trade performance logs
 */
export function generatePdfReport(trades: Trade[], currencySymbol: string = '$'): void {
  const stats = calculateTradingStats(trades);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const nowString = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // --- Theme Palette ---
  const PRIMARY_COLOR = [15, 23, 42]; // Slate 900 #0f172a
  const ACCENT_COLOR = [99, 102, 241]; // Indigo 500 #6366f1
  const BORDER_COLOR = [226, 232, 240]; // Slate 200 #e2e8f0
  const TEXT_DARK = [51, 65, 85]; // Slate 700
  const TEXT_LIGHT = [148, 163, 184]; // Slate 400
  const WIN_GREEN = [16, 185, 129]; // Emerald 500
  const LOSS_RED = [239, 68, 68]; // Red 500

  // --- Document Header ---
  // Draw primary dark banner
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(0, 0, 210, 38, 'F');

  // Draw indigo highlight bar
  doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
  doc.rect(0, 38, 210, 2, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('RISKYVASU', 14, 18);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(191, 196, 210);
  doc.text(`PROFESSIONAL JOURNAL & ANALYTICS REPORT`, 14, 25);
  doc.text(`Generated: ${nowString}`, 14, 30);

  // Accent Logo Marker
  doc.setFillColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
  doc.text('RV', 182, 20);

  // Reset text color
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);

  // --- KPI Card Blocks ---
  const startY = 48;
  const cardWidth = 43;
  const cardHeight = 22;
  const cardSpacing = 6;
  const marginX = 14;

  const kpis = [
    { label: 'Net Profit', value: formatCurrency(stats.totalPnL, currencySymbol), isPnl: true, pnlVal: stats.totalPnL },
    { label: 'Win Rate', value: formatPercent(stats.winRate), isPnl: false },
    { label: 'Profit Factor', value: stats.profitFactor.toFixed(2), isPnl: false },
    { label: 'Total Trades', value: stats.totalTrades.toString(), isPnl: false },
  ];

  kpis.forEach((kpi, idx) => {
    const x = marginX + idx * (cardWidth + cardSpacing);
    
    // Draw card boundary shadow-border
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.setFillColor(252, 253, 254);
    doc.rect(x, startY, cardWidth, cardHeight, 'FD');

    // Accent line at left edge
    doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
    doc.rect(x, startY, 1.5, cardHeight, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
    doc.text(kpi.label.toUpperCase(), x + 4, startY + 6);

    // Value
    doc.setFontSize(11);
    if (kpi.isPnl && kpi.pnlVal !== undefined) {
      if (kpi.pnlVal > 0) {
        doc.setTextColor(WIN_GREEN[0], WIN_GREEN[1], WIN_GREEN[2]);
      } else if (kpi.pnlVal < 0) {
        doc.setTextColor(LOSS_RED[0], LOSS_RED[1], LOSS_RED[2]);
      } else {
        doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
      }
    } else {
      doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x + 4, startY + 16);
  });

  // --- Second Level Statistics Row ---
  const secY = startY + cardHeight + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('Trading Performance Details', marginX, secY);

  doc.line(marginX, secY + 2, 196, secY + 2);

  // Performance specs grid
  const performanceSpecs = [
    { name: 'Wins / Losses', val: `${stats.winsCount} Wins / ${stats.lossesCount} Losses` },
    { name: 'Average Winning Trade', val: formatCurrency(stats.avgWin, currencySymbol) },
    { name: 'Average Losing Trade', val: formatCurrency(stats.avgLoss, currencySymbol) },
    { name: 'Largest Win', val: formatCurrency(stats.largestWin, currencySymbol) },
    { name: 'Largest Loss', val: formatCurrency(stats.largestLoss, currencySymbol) },
    { name: 'Max Drawdown', val: formatCurrency(stats.maxDrawdown, currencySymbol) },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);

  performanceSpecs.forEach((spec, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const specX = col === 0 ? marginX : marginX + 90;
    const specY = secY + 7 + row * 6;

    // Field Label
    doc.setFont('helvetica', 'bold');
    doc.text(`${spec.name}:`, specX, specY);

    // Field Value
    doc.setFont('helvetica', 'normal');
    doc.text(spec.val, specX + 45, specY);
  });

  // --- Trade logs Table title ---
  const tableTitleY = secY + 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('Closed Execution Log Feed', marginX, tableTitleY);

  // Build the autotable data row arrays
  const tableBody = trades
    .filter(t => t.status === 'Closed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
    .map(t => {
      const pnl = t.pnl || 0;
      const formattedPnL = formatCurrency(pnl, currencySymbol);
      const formattedRoi = formatPercent(t.roi || 0);

      return [
        t.date,
        t.instrument,
        t.assetClass,
        t.side.toUpperCase(),
        formatCurrency(t.entryPrice, currencySymbol),
        formatCurrency(t.exitPrice || 0, currencySymbol),
        t.quantity.toString(),
        t.strategy || 'Unassigned',
        `${formattedPnL} (${formattedRoi})`
      ];
    });

  // Render Table
  autoTable(doc, {
    startY: tableTitleY + 3,
    head: [['Date', 'Symbol', 'Asset', 'Side', 'Entry', 'Exit', 'Qty', 'Strategy', 'Net P&L']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85], // Slate 700
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 15 },
      3: { cellWidth: 15 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 12 },
      7: { cellWidth: 28 },
      8: { cellWidth: 32, fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      // Highlight Net P&L cell based on value
      if (data.column.index === 8 && data.cell.section === 'body') {
        const text = data.cell.raw as string;
        if (text.startsWith('-')) {
          doc.setTextColor(LOSS_RED[0], LOSS_RED[1], LOSS_RED[2]);
        } else if (text !== '$0.00' && text !== '0.00%') {
          doc.setTextColor(WIN_GREEN[0], WIN_GREEN[1], WIN_GREEN[2]);
        }
      }
    },
    margin: { left: marginX, right: marginX },
  });

  // Save the PDF
  doc.save('riskyvasu_journal_report.pdf');
}

/**
 * Generates and downloads a prop firm style Certificate of Excellence for a single execution
 */
export function generateTradeCertificate(trade: Trade, userProfile: UserProfile): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // A4 Landscape is 297mm x 210mm
  const width = 297;
  const height = 210;

  // --- Background Design & Borders ---
  // Slate 900 Background fill
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, width, height, 'F');

  // Double gold accent border
  doc.setDrawColor(234, 179, 8); // Gold #eab308
  doc.setLineWidth(1);
  doc.rect(8, 8, width - 16, height - 16, 'D');
  doc.rect(9.5, 9.5, width - 19, height - 19, 'D');

  // Decorative corners
  const cornerSize = 10;
  doc.setFillColor(234, 179, 8);
  doc.rect(8, 8, cornerSize, cornerSize, 'F');
  doc.rect(width - 8 - cornerSize, 8, cornerSize, cornerSize, 'F');
  doc.rect(8, height - 8 - cornerSize, cornerSize, cornerSize, 'F');
  doc.rect(width - 8 - cornerSize, height - 8 - cornerSize, cornerSize, cornerSize, 'F');

  // --- Certificate Title ---
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('RISKYVASU TRADING TERMINAL', width / 2, 25, { align: 'center' });

  doc.setTextColor(234, 179, 8); // Gold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('CERTIFICATE OF EXECUTION EXCELLENCE', width / 2, 42, { align: 'center' });

  // Divider line
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(0.5);
  doc.line(60, 48, width - 60, 48);

  // Description
  doc.setTextColor(228, 228, 231); // Zinc 200
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text(
    `This official document certifies that the execution logged by trader`,
    width / 2,
    62,
    { align: 'center' }
  );

  // Trader Username
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(userProfile.username.toUpperCase(), width / 2, 74, { align: 'center' });

  // Sub description
  doc.setTextColor(228, 228, 231);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(
    `on date ${trade.date} at time ${trade.time} has passed all performance metrics.`,
    width / 2,
    86,
    { align: 'center' }
  );

  // --- Trade Specs Panel ---
  const panelY = 98;
  const panelWidth = 230;
  const panelHeight = 48;
  const panelX = (width - panelWidth) / 2;

  // Draw panel box
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.setDrawColor(51, 65, 85); // Slate 700
  doc.setLineWidth(0.5);
  doc.rect(panelX, panelY, panelWidth, panelHeight, 'FD');

  // Specs Columns
  const specs = [
    { label: 'SYMBOL', val: trade.instrument },
    { label: 'SIDE', val: trade.side.toUpperCase() },
    { label: 'ENTRY', val: formatCurrency(trade.entryPrice, userProfile.currency) },
    { label: 'EXIT', val: trade.exitPrice ? formatCurrency(trade.exitPrice, userProfile.currency) : 'OPEN' },
    { label: 'NET PNL', val: trade.pnl !== undefined ? formatCurrency(trade.pnl, userProfile.currency) : 'OPEN', isPnl: true, pnlVal: trade.pnl },
    { label: 'ROI (%)', val: trade.roi !== undefined ? formatPercent(trade.roi) : 'OPEN' },
    { label: 'STRATEGY', val: trade.strategy },
  ];

  const colWidth = panelWidth / specs.length;
  specs.forEach((spec, idx) => {
    const x = panelX + idx * colWidth;
    
    // Vertical grid line
    if (idx > 0) {
      doc.setDrawColor(51, 65, 85);
      doc.line(x, panelY, x, panelY + panelHeight);
    }

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(spec.label, x + colWidth / 2, panelY + 12, { align: 'center' });

    // Value
    doc.setFontSize(11);
    if (spec.isPnl && spec.pnlVal !== undefined) {
      if (spec.pnlVal >= 0) {
        doc.setTextColor(16, 185, 129); // Win Green
      } else {
        doc.setTextColor(239, 68, 68); // Loss Red
      }
    } else {
      doc.setTextColor(255, 255, 255);
    }
    doc.text(spec.val, x + colWidth / 2, panelY + 30, { align: 'center' });
  });

  // --- Discipline / Mistakes assessment ---
  const mistakes = trade.mistakes || [];
  const disciplineScore = Math.max(0, 100 - mistakes.length * 20);

  const assessY = panelY + panelHeight + 14;
  doc.setTextColor(228, 228, 231);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DISCIPLINE AUDIT REPORT:', panelX + 32, assessY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  if (mistakes.length === 0) {
    doc.setTextColor(16, 185, 129);
    doc.text('100% PERFECT COMPLIANCE - ZERO EMOTIONAL RULES VIOLATED', panelX + 90, assessY);
  } else {
    doc.setTextColor(239, 68, 68);
    doc.text(`RULES VIOLATED: ${mistakes.join(', ').toUpperCase()}`, panelX + 90, assessY);
  }

  // --- Footer Seals and Signatures ---
  const footerY = 176;

  // Signature line
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(32, footerY, 92, footerY);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('TRADING DESK AUDITOR', 62, footerY + 5, { align: 'center' });

  // Unified score badge
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`DISCIPLINE SCORE: ${disciplineScore}/100`, 62, footerY - 4, { align: 'center' });

  // Styled Vector Prop Firm Seal stamp
  const sealX = width - 74;
  const sealY = footerY - 10;
  
  doc.setDrawColor(234, 179, 8); // Gold
  doc.setLineWidth(0.8);
  doc.circle(sealX, sealY, 15, 'D');
  doc.circle(sealX, sealY, 13.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(234, 179, 8);
  doc.text('SECURED', sealX, sealY - 4, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text('VERIFIED', sealX, sealY + 2, { align: 'center' });
  doc.setFontSize(5.5);
  doc.text('RISKYVASU', sealX, sealY + 7, { align: 'center' });

  // Stylized Vector QR Code stamp (Mock digital stamp/QR representation)
  const qrX = width - 36;
  const qrY = footerY - 22;
  const qrSize = 24;

  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(0.5);
  doc.rect(qrX, qrY, qrSize, qrSize, 'D');
  
  // Render grid of geometric nodes to serve as an elegant vector QR code
  doc.setFillColor(234, 179, 8);
  doc.rect(qrX + 2, qrY + 2, 6, 6, 'F');
  doc.rect(qrX + 16, qrY + 2, 6, 6, 'F');
  doc.rect(qrX + 2, qrY + 16, 6, 6, 'F');
  doc.rect(qrX + 10, qrY + 10, 4, 4, 'F');
  doc.rect(qrX + 18, qrY + 18, 4, 4, 'F');
  doc.rect(qrX + 12, qrY + 16, 2, 2, 'F');
  doc.rect(qrX + 16, qrY + 12, 2, 2, 'F');

  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('SCAN TERMINAL', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });

  // Save the PDF
  doc.save(`certificate_trade_${trade.instrument}_${trade.date}.pdf`);
}

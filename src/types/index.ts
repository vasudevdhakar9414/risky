export type AssetClass = 'Stock' | 'Crypto' | 'Forex' | 'Option';

export type TradeSide = 'Long' | 'Short';

export type TradeStatus = 'Open' | 'Closed';

export interface Trade {
  id: string;
  date: string;          // ISO String (YYYY-MM-DD)
  time: string;          // HH:MM
  instrument: string;    // e.g. BTCUSDT, TSLA, EURUSD
  assetClass: AssetClass;
  side: TradeSide;
  status: TradeStatus;
  entryPrice: number;
  exitPrice?: number;    // undefined if open
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  fees: number;
  strategy: string;      // Strategy ID or Name
  pnl?: number;          // Net Profit/Loss calculated automatically
  roi?: number;          // ROI (%) calculated automatically
  riskRewardRatio?: number;
  notes?: string;
  screenshotUrl?: string; // Optional screenshot path or base64 URL
  mistakes?: string[];    // Array of behavioral mistakes
  complianceScore?: number; // Checklist compliance score (%)
  checkedRules?: string[]; // Completed rules lists
  certificateId?: string; // Cryptographic verification token
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  rules?: string[]; // rules checklist array
  riskParameters?: {
    maxRiskPerTrade?: number;
    stopLossRequired?: boolean;
    profitTargetMultiplier?: number;
  };
  screenshotUrl?: string;
}

export interface RiskLimits {
  dailyLossLimit: number; // in USD
  maxDrawdown: number;    // in USD
  riskPerTrade: number;   // in USD or %
}

export interface UserProfile {
  username: string;
  email: string;
  currency: string;       // e.g., USD, EUR, GBP
  avatarSeed: string;     // for generating avatar
  startingBalance: number;
  brokerName: string;
  accountType: string;
  status?: string;
}

export type ActiveTab = 'landing' | 'dashboard' | 'journal' | 'analytics' | 'calendar' | 'settings' | 'login' | 'admin' | 'certificate' | 'verify';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Trade, Strategy, RiskLimits, UserProfile } from '../types';
import { calculateTradingStats, type TradingStats } from '../utils/helpers';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

interface TradeContextType {
  trades: Trade[];
  strategies: Strategy[];
  riskLimits: RiskLimits;
  userProfile: UserProfile;
  stats: TradingStats;
  addTrade: (trade: Omit<Trade, 'id' | 'pnl' | 'roi'>) => Promise<void>;
  updateTrade: (trade: Trade) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  addStrategy: (name: string, description: string, rules?: string[], riskParameters?: any, screenshotUrl?: string) => Promise<void>;
  updateRiskLimits: (limits: RiskLimits) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  isLoadingData: boolean;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

// --- Mapping Helpers to bridge React camelCase and Postgres snake_case ---
const mapTradeToDb = (trade: Partial<Trade>, userId: string) => {
  return {
    user_id: userId,
    date: trade.date,
    time: trade.time ? `${trade.time}:00` : '00:00:00',
    instrument: trade.instrument,
    asset_class: trade.assetClass,
    side: trade.side,
    status: trade.status,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    quantity: trade.quantity,
    stop_loss: trade.stopLoss,
    take_profit: trade.takeProfit,
    fees: trade.fees || 0,
    strategy: trade.strategy,
    pnl: trade.pnl,
    roi: trade.roi,
    risk_reward_ratio: trade.riskRewardRatio,
    notes: trade.notes || '',
    screenshot_url: trade.screenshotUrl || '',
    mistakes: trade.mistakes || [],
    compliance_score: trade.complianceScore !== undefined ? trade.complianceScore : 100,
    checked_rules: trade.checkedRules || [],
  };
};

const mapTradeFromDb = (dbTrade: any): Trade => {
  return {
    id: dbTrade.id,
    date: dbTrade.date,
    time: dbTrade.time ? dbTrade.time.slice(0, 5) : '00:00',
    instrument: dbTrade.instrument,
    assetClass: dbTrade.asset_class,
    side: dbTrade.side,
    status: dbTrade.status,
    entryPrice: Number(dbTrade.entry_price),
    exitPrice: dbTrade.exit_price ? Number(dbTrade.exit_price) : undefined,
    quantity: Number(dbTrade.quantity),
    stopLoss: dbTrade.stop_loss ? Number(dbTrade.stop_loss) : undefined,
    takeProfit: dbTrade.take_profit ? Number(dbTrade.take_profit) : undefined,
    fees: Number(dbTrade.fees || 0),
    strategy: dbTrade.strategy,
    pnl: dbTrade.pnl !== null && dbTrade.pnl !== undefined ? Number(dbTrade.pnl) : undefined,
    roi: dbTrade.roi !== null && dbTrade.roi !== undefined ? Number(dbTrade.roi) : undefined,
    riskRewardRatio: dbTrade.risk_reward_ratio !== null && dbTrade.risk_reward_ratio !== undefined ? Number(dbTrade.risk_reward_ratio) : undefined,
    notes: dbTrade.notes || '',
    screenshotUrl: dbTrade.screenshot_url || undefined,
    mistakes: dbTrade.mistakes || [],
    complianceScore: dbTrade.compliance_score !== null && dbTrade.compliance_score !== undefined ? Number(dbTrade.compliance_score) : 100,
    checkedRules: dbTrade.checked_rules || [],
    certificateId: dbTrade.certificate_id || dbTrade.id,
  };
};

export const TradeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [riskLimits, setRiskLimits] = useState<RiskLimits>({
    dailyLossLimit: 500,
    maxDrawdown: 2500,
    riskPerTrade: 100,
  });
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: 'Risky Trader',
    email: 'trader@riskyvasu.com',
    currency: '$',
    avatarSeed: 'outfit-default',
    startingBalance: 10000,
    brokerName: 'Generic Broker',
    accountType: 'Live',
  });

  // Load risk limits locally (client preference parameters)
  useEffect(() => {
    const localRisk = localStorage.getItem('tm_risk');
    if (localRisk) setRiskLimits(JSON.parse(localRisk));
  }, []);

  // Fetch or Seed profiles, trades, and strategies based on Active Mode
  useEffect(() => {
    const loadSessionData = async () => {
      setIsLoadingData(true);
      
      if (isSupabaseConfigured && supabase && isAuthenticated && user?.id) {
        try {
          // 0. Fetch or Self-Heal user Profile
          const { data: dbProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (!profileError && dbProfile) {
            setUserProfile({
              username: dbProfile.username,
              email: dbProfile.email,
              currency: dbProfile.currency || '$',
              avatarSeed: dbProfile.avatar_seed || 'outfit-default',
              startingBalance: dbProfile.starting_balance ? Number(dbProfile.starting_balance) : Number(localStorage.getItem('rv_starting_balance') || 10000),
              brokerName: dbProfile.broker_name || localStorage.getItem('rv_broker_name') || 'Generic Broker',
              accountType: dbProfile.account_type || localStorage.getItem('rv_account_type') || 'Live',
            });
          } else {
            const newProfilePayload = {
              id: user.id,
              username: user.username || user.email.split('@')[0],
              email: user.email,
              currency: '$',
              avatar_seed: 'outfit-default'
            };
            await supabase.from('profiles').upsert([newProfilePayload]);
            setUserProfile({
              username: newProfilePayload.username,
              email: newProfilePayload.email,
              currency: '$',
              avatarSeed: 'outfit-default',
              startingBalance: Number(localStorage.getItem('rv_starting_balance') || 10000),
              brokerName: localStorage.getItem('rv_broker_name') || 'Generic Broker',
              accountType: localStorage.getItem('rv_account_type') || 'Live',
            });
          }

          // 1. Fetch Remote Strategies
          const { data: dbStrats, error: stratError } = await supabase
            .from('strategies')
            .select('*')
            .order('name', { ascending: true });

          if (!stratError && dbStrats) {
            setStrategies(dbStrats.map(s => ({ 
              id: s.id, 
              name: s.name, 
              description: s.description || '',
              rules: s.rules || [],
              riskParameters: s.risk_parameters || {},
              screenshotUrl: s.screenshot_url || '',
            })));
          }

          // 2. Fetch Remote Trades
          const { data: dbTrades, error: tradeError } = await supabase
            .from('trades')
            .select('*')
            .order('date', { ascending: false });

          if (!tradeError && dbTrades) {
            setTrades(dbTrades.map(mapTradeFromDb));
          } else if (tradeError) {
            console.error('Error fetching trades from Supabase:', tradeError);
          }
        } catch (err) {
          console.error('Supabase query error:', err);
        }
      } else {
        setTrades([]);
        setStrategies([]);
      }
      setIsLoadingData(false);
    };

    loadSessionData();
  }, [isAuthenticated, user?.id]);

  // Position Sizing and Multi-Asset Calculation Engine
  const calculatePnlAndRoi = (tradeData: any) => {
    let pnl: number | undefined = undefined;
    let roi: number | undefined = undefined;

    if (tradeData.status === 'Closed' && tradeData.exitPrice !== undefined) {
      const entry = tradeData.entryPrice;
      const exit = tradeData.exitPrice;
      const qty = tradeData.quantity;
      const fees = tradeData.fees || 0;
      const isLong = tradeData.side === 'Long';
      const sideMult = isLong ? 1 : -1;

      if (tradeData.assetClass === 'Forex') {
        const isJpy = tradeData.instrument.toUpperCase().includes('JPY');
        if (isJpy) {
          // JPY quotes: diff * 100,000 / exitPrice to convert back to USD standard standard contracts
          const pnlJpy = sideMult * (exit - entry) * qty * 100000;
          pnl = (pnlJpy / (exit || 1)) - fees;
        } else {
          // Standard major: price diff * 100,000 * lots
          pnl = sideMult * (exit - entry) * qty * 100000 - fees;
        }
      } else if (tradeData.assetClass === 'Option') {
        // Option contracts standard is 1 contract = 100 shares
        pnl = sideMult * (exit - entry) * 100 * qty - fees;
      } else if (tradeData.instrument.toUpperCase().includes('XAU') || tradeData.instrument.toUpperCase().includes('GOLD')) {
        // Gold (XAUUSD): 1 lot = 100 ounces
        pnl = sideMult * (exit - entry) * qty * 100 - fees;
      } else if (tradeData.instrument.toUpperCase().includes('XAG') || tradeData.instrument.toUpperCase().includes('SILVER')) {
        // Silver (XAGUSD): 1 lot = 5000 ounces
        pnl = sideMult * (exit - entry) * qty * 5000 - fees;
      } else if (tradeData.assetClass === 'Crypto') {
        // Crypto standard is direct units
        pnl = sideMult * (exit - entry) * qty - fees;
      } else if (tradeData.assetClass === 'Stock') {
        // Stocks share units
        pnl = sideMult * (exit - entry) * qty - fees;
      } else {
        // Indices: Nasdaq, US30 contracts multiplier typically 10x index points
        const isIndex = ['US30', 'NAS', 'SPX', 'GER', 'UK100'].some(idx => tradeData.instrument.toUpperCase().includes(idx));
        const indexMult = isIndex ? 10 : 1;
        pnl = sideMult * (exit - entry) * qty * indexMult - fees;
      }

      const startingBal = userProfile.startingBalance || 10000;
      roi = (pnl / startingBal) * 100;
    }

    return {
      pnl: pnl !== undefined ? parseFloat(pnl.toFixed(2)) : undefined,
      roi: roi !== undefined ? parseFloat(roi.toFixed(2)) : undefined,
    };
  };

  const addTrade = async (tradeData: Omit<Trade, 'id' | 'pnl' | 'roi'>) => {
    const { pnl, roi } = calculatePnlAndRoi(tradeData);

    let rr: number | undefined = undefined;
    if (tradeData.stopLoss) {
      const risk = Math.abs(tradeData.entryPrice - tradeData.stopLoss);
      if (tradeData.takeProfit) {
        const reward = Math.abs(tradeData.takeProfit - tradeData.entryPrice);
        rr = parseFloat((reward / (risk === 0 ? 1 : risk)).toFixed(2));
      }
    }

    const completeTradeData = {
      ...tradeData,
      pnl,
      roi,
      riskRewardRatio: rr,
    };

    if (isSupabaseConfigured && supabase && isAuthenticated && user?.id) {
      const dbPayload = mapTradeToDb(completeTradeData, user.id!);
      
      const { data, error } = await supabase
        .from('trades')
        .insert([dbPayload])
        .select('*');

      if (!error && data && data[0]) {
        setTrades([mapTradeFromDb(data[0]), ...trades]);
      } else if (error) {
        // Fallback checks for missing columns
        const isMistakesMissing = error.code === 'PGRST204' && error.message.includes('mistakes');
        const isSaaSMissing = error.code === 'PGRST204' && (error.message.includes('compliance_score') || error.message.includes('checked_rules'));

        if (isMistakesMissing || isSaaSMissing) {
          const { mistakes, compliance_score, checked_rules, ...payloadWithoutSaaS } = dbPayload;
          const { data: retryData, error: retryError } = await supabase
            .from('trades')
            .insert([payloadWithoutSaaS])
            .select('*');

          if (!retryError && retryData && retryData[0]) {
            setTrades([mapTradeFromDb(retryData[0]), ...trades]);
            alert("Trade saved successfully. Note: SaaS columns (mistakes, compliance_score) are missing in your Supabase trades table. To enable full checklist tracking, execute the SQL migration script (supabase_schema_update.sql) in your Supabase Dashboard SQL Editor.");
            return;
          }
          console.error('Supabase insert retry error:', retryError?.message);
          alert(`Failed to save trade: ${retryError?.message || 'Unknown error'}`);
        } else {
          console.error('Supabase insert error:', error.message);
          alert(`Failed to save trade: ${error.message}`);
        }
      }
    }
  };

  const updateTrade = async (updatedTrade: Trade) => {
    const { pnl, roi } = calculatePnlAndRoi(updatedTrade);

    let rr: number | undefined = undefined;
    if (updatedTrade.stopLoss) {
      const risk = Math.abs(updatedTrade.entryPrice - updatedTrade.stopLoss);
      if (updatedTrade.takeProfit) {
        const reward = Math.abs(updatedTrade.takeProfit - updatedTrade.entryPrice);
        rr = parseFloat((reward / (risk === 0 ? 1 : risk)).toFixed(2));
      }
    }

    const completedTrade: Trade = {
      ...updatedTrade,
      pnl,
      roi,
      riskRewardRatio: rr,
    };

    if (isSupabaseConfigured && supabase && isAuthenticated && user?.id) {
      const dbPayload = mapTradeToDb(completedTrade, user.id!);
      const { error } = await supabase
        .from('trades')
        .update(dbPayload)
        .eq('id', updatedTrade.id);

      if (!error) {
        setTrades(trades.map(t => (t.id === updatedTrade.id ? completedTrade : t)));
      } else {
        const isMistakesMissing = error.code === 'PGRST204' && error.message.includes('mistakes');
        const isSaaSMissing = error.code === 'PGRST204' && (error.message.includes('compliance_score') || error.message.includes('checked_rules'));

        if (isMistakesMissing || isSaaSMissing) {
          const { mistakes, compliance_score, checked_rules, ...payloadWithoutSaaS } = dbPayload;
          const { error: retryError } = await supabase
            .from('trades')
            .update(payloadWithoutSaaS)
            .eq('id', updatedTrade.id);

          if (!retryError) {
            const localCompletedTrade = { ...completedTrade, mistakes: [], complianceScore: 100, checkedRules: [] };
            setTrades(trades.map(t => (t.id === updatedTrade.id ? localCompletedTrade : t)));
            alert("Trade updated successfully. Note: SaaS columns (mistakes, compliance_score) are missing in your Supabase trades table. To enable full checklist tracking, execute the SQL migration script (supabase_schema_update.sql) in your Supabase Dashboard SQL Editor.");
            return;
          }
          console.error('Supabase update retry error:', retryError.message);
          alert(`Failed to update trade: ${retryError.message}`);
        } else {
          console.error('Supabase update error:', error.message);
          alert(`Failed to update trade: ${error.message}`);
        }
      }
    }
  };

  const deleteTrade = async (id: string) => {
    if (isSupabaseConfigured && supabase && isAuthenticated && user?.id) {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id);

      if (!error) {
        setTrades(trades.filter(t => t.id !== id));
      } else {
        console.error('Supabase delete error:', error.message);
      }
    }
  };

  const loadDemoData = async () => {};

  const clearAllData = async () => {
    if (isSupabaseConfigured && supabase && isAuthenticated && user?.id) {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', user.id!);

      if (!error) {
        setTrades([]);
      } else {
        console.error('Supabase clear logs error:', error.message);
      }
    }
  };

  const addStrategy = async (name: string, description: string, rules: string[] = [], riskParameters: any = {}, screenshotUrl: string = '') => {
    if (isSupabaseConfigured && supabase && isAuthenticated && user?.id) {
      const dbPayload: any = { 
        user_id: user.id!, 
        name, 
        description 
      };
      
      dbPayload.rules = rules;
      dbPayload.risk_parameters = riskParameters;
      dbPayload.screenshot_url = screenshotUrl;

      const { data, error } = await supabase
        .from('strategies')
        .insert([dbPayload])
        .select('*');

      if (!error && data && data[0]) {
        setStrategies([...strategies, { 
          id: data[0].id, 
          name: data[0].name, 
          description: data[0].description,
          rules: data[0].rules || [],
          riskParameters: data[0].risk_parameters || {},
          screenshotUrl: data[0].screenshot_url || '',
        }]);
      } else if (error) {
        if (error.code === 'PGRST204' && (error.message.includes('rules') || error.message.includes('risk_parameters'))) {
          // Retrying without SaaS strategy columns
          const { rules, risk_parameters, screenshot_url, ...basePayload } = dbPayload;
          const { data: retryData, error: retryError } = await supabase
            .from('strategies')
            .insert([basePayload])
            .select('*');

          if (!retryError && retryData && retryData[0]) {
            setStrategies([...strategies, { 
              id: retryData[0].id, 
              name: retryData[0].name, 
              description: retryData[0].description,
              rules: [],
              riskParameters: {},
              screenshotUrl: '',
            }]);
            alert("Strategy registered successfully! Note: Custom strategy checklist columns are missing in your Supabase strategies table. Run supabase_schema_update.sql in your dashboard to enable full checklists.");
            return;
          }
          alert(`Failed to add strategy: ${retryError?.message || 'Unknown error'}`);
        } else {
          console.error('Supabase strategy insert error:', error.message);
          alert(`Failed to add strategy: ${error.message}`);
        }
      }
    }
  };

  const updateRiskLimits = (limits: RiskLimits) => {
    setRiskLimits(limits);
    localStorage.setItem('tm_risk', JSON.stringify(limits));
  };

  const updateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
    const updated = { ...userProfile, ...profileUpdate };
    setUserProfile(updated);
    
    if (profileUpdate.startingBalance !== undefined) localStorage.setItem('rv_starting_balance', profileUpdate.startingBalance.toString());
    if (profileUpdate.brokerName !== undefined) localStorage.setItem('rv_broker_name', profileUpdate.brokerName);
    if (profileUpdate.accountType !== undefined) localStorage.setItem('rv_account_type', profileUpdate.accountType);

    if (isSupabaseConfigured && supabase && isAuthenticated && user?.id) {
      const dbPayload: any = {
        username: updated.username,
        currency: updated.currency,
        avatar_seed: updated.avatarSeed,
        updated_at: new Date().toISOString()
      };
      
      dbPayload.starting_balance = updated.startingBalance;
      dbPayload.broker_name = updated.brokerName;
      dbPayload.account_type = updated.accountType;

      const { error } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', user.id);
        
      if (error) {
        if (error.code === 'PGRST204' && (error.message.includes('starting_balance') || error.message.includes('broker_name'))) {
          // Self-heal: retry update by omitting SaaS custom columns
          const { starting_balance, broker_name, account_type, ...basePayload } = dbPayload;
          const { error: retryError } = await supabase
            .from('profiles')
            .update(basePayload)
            .eq('id', user.id);
          if (retryError) {
            console.error('Error updating base profile:', retryError.message);
          }
        } else {
          console.error('Error updating profiles inside Supabase:', error.message);
        }
      }
    }
  };

  // Derived stats
  const stats = calculateTradingStats(trades, userProfile.startingBalance);

  return (
    <TradeContext.Provider
      value={{
        trades,
        strategies,
        riskLimits,
        userProfile,
        stats,
        addTrade,
        updateTrade,
        deleteTrade,
        loadDemoData,
        clearAllData,
        addStrategy,
        updateRiskLimits,
        updateUserProfile,
        isLoadingData,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
};

export const useTrades = () => {
  const context = useContext(TradeContext);
  if (context === undefined) {
    throw new Error('useTrades must be used within a TradeProvider');
  }
  return context;
};

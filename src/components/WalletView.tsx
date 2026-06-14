import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  TrendingUp,
  History,
  ArrowRightLeft,
  Zap,
  X,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import type { UserData } from '../lib/api';

interface WalletViewProps {
  userData: UserData | null;
  onOpenSettings: () => void;
}

export default function WalletView({ userData, onOpenSettings }: WalletViewProps) {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const dailyGoal = 5;
  const progress = Math.min(((userData?.recycledWeight ?? 0) / dailyGoal) * 100, 100);

  const handleWithdraw = () => {
    setTimeout(() => {
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowWithdraw(false);
      }, 3000);
    }, 1500);
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col p-6 overflow-y-auto pb-32 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-xl font-bold uppercase tracking-tighter italic">Wallet_Hub</h2>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Wallet Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full relative py-10 px-8 rounded-[32px] overflow-hidden mb-8 border border-white/10 bg-[#141414] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <div className="absolute inset-0 bg-[#00FF41]/5 z-0" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, #00FF41 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-white/30 text-[10px] font-mono uppercase tracking-[0.3em] mb-4">
            Current_Intel_Value
          </span>
          <div className="flex items-baseline gap-2 mb-10">
            <span className="text-5xl font-mono font-black text-[#00FF41] tracking-tighter italic">
              {userData?.balance?.toLocaleString() ?? '0'}
            </span>
            <span className="text-white/40 font-bold text-lg uppercase font-mono">Kz</span>
          </div>

          <button
            onClick={() => setShowWithdraw(true)}
            className="w-full py-4 bg-[#00FF41] text-black rounded-xl font-bold text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 shadow-[0_5px_20px_rgba(0,255,65,0.2)] active:scale-95 transition-all"
          >
            <ArrowRightLeft size={16} />
            Offload_To_Unitel_Money
          </button>
        </div>
      </motion.div>

      {/* Daily Impact Goal */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-yellow-500" />
            <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-white/60">
              Daily_Impact_Goal
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#00FF41]">
            {userData?.recycledWeight?.toFixed(1) ?? '0'} / {dailyGoal} KG
          </span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-[#00FF41] to-[#00FF41]/60 shadow-[0_0_10px_#00FF41]"
          />
        </div>
        <p className="text-[8px] text-white/20 font-mono mt-3 uppercase tracking-widest leading-relaxed">
          {progress >= 100
            ? 'GOAL_MET: +500kz BONUS UNLOCKED'
            : `Collect ${Math.max(0, dailyGoal - (userData?.recycledWeight ?? 0)).toFixed(1)} more KG to reach daily quota.`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <StatCard
          icon={<TrendingUp className="text-[#00FF41]" />}
          label="Mass_Offset"
          value={userData?.recycledWeight?.toFixed(1) ?? '0.0'}
          unit="KG"
        />
        <StatCard
          icon={<Trophy className="text-[#00FF41]" />}
          label="Kz_Earned"
          value={userData?.balance?.toLocaleString() ?? '0'}
          unit="Kz"
        />
      </div>

      {/* Market Heat */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className="font-mono font-black text-xs uppercase tracking-[0.2em] text-white/50">
            Market_Heat_Status
          </h3>
          <span className="text-[10px] text-[#00FF41] font-mono flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
            LIVE_FEED
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <SurgeItem material="PET_Invariants" multiplier="2.0x" location="Talatona_Sector" color="text-[#00FF41]" />
          <SurgeItem material="Aluminum_Core" multiplier="2.5x" location="Maianga_Sector" color="text-white/60" />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className="font-mono font-black text-xs uppercase tracking-[0.2em] text-white/50">
            Transmission_Log
          </h3>
          <History size={14} className="text-white/20" />
        </div>
        <div className="flex flex-col gap-2">
          {userData?.lastClaim ? (
            <ActivityItem
              label="Bounty_Claim"
              date="Recent"
              amount={`+${(userData.lastClaim as { amount?: number }).amount ?? 0}`}
              material={String((userData.lastClaim as { material?: unknown }).material ?? 'ECO')}
              status="VERIFIED"
            />
          ) : (
            <ActivityItem label="Initial_Sync" date="Now" amount="+0" material="SYS" status="VERIFIED" />
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm glass p-8 rounded-[40px] border border-white/10"
            >
              {!withdrawSuccess ? (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-bold uppercase tracking-tighter italic text-white/80">
                      Asset_Offload
                    </h3>
                    <button onClick={() => setShowWithdraw(false)} className="text-white/20 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 bg-[#00FF41]/5 border border-[#00FF41]/20 rounded-3xl mb-8">
                    <p className="text-[10px] text-[#00FF41] font-mono uppercase tracking-widest mb-2">
                      Target_Wallet
                    </p>
                    <p className="font-mono text-sm tracking-tight text-white/80">
                      Unitel Money: +244 9XX XXX XXX
                    </p>
                  </div>

                  <div className="mb-8">
                    <p className="text-[10px] text-white/20 font-mono uppercase tracking-widest mb-4">
                      Payload_Amount
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-mono font-black text-white">
                        {userData?.balance?.toLocaleString() ?? '0'}
                      </span>
                      <span className="text-white/30 font-bold uppercase">Kz</span>
                    </div>
                  </div>

                  <button
                    onClick={handleWithdraw}
                    className="w-full py-5 bg-[#00FF41] text-black rounded-2xl font-bold text-xs uppercase tracking-[0.4em] shadow-lg hover:brightness-110 active:scale-95 transition-all"
                  >
                    CONFIRM_TRANSIT
                  </button>
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-[#00FF41]/10 border border-[#00FF41]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-[#00FF41]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#00FF41] uppercase tracking-tighter italic mb-2">
                    Transit_Complete
                  </h3>
                  <p className="text-white/40 text-xs font-mono tracking-tight px-4 leading-relaxed uppercase">
                    Asset tokens have been released to your mobile money provider.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
      <div className="p-2 rounded-lg bg-white/5 inline-block mb-4">{icon}</div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-mono font-black tracking-tighter">{value}</span>
        <span className="text-[9px] text-white/30 font-bold uppercase">{unit}</span>
      </div>
      <span className="text-[9px] text-white/30 block uppercase font-mono tracking-widest">{label}</span>
    </div>
  );
}

function SurgeItem({ material, multiplier, location, color }: { material: string; multiplier: string; location: string; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Zap size={18} />
        </div>
        <div>
          <h4 className="font-bold text-xs uppercase tracking-tight">{material}</h4>
          <p className="text-[8px] text-white/30 font-mono uppercase mt-0.5 tracking-wider">{location}</p>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-lg font-mono font-black ${color}`}>{multiplier}</div>
        <div className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Yield</div>
      </div>
    </div>
  );
}

function ActivityItem({ label, date, amount, material, status }: { label: string; date: string; amount: string; material: string; status: string }) {
  const isPositive = amount.startsWith('+');
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-transparent hover:border-white/10 transition-all">
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] border ${
            isPositive
              ? 'border-[#00FF41]/20 bg-[#00FF41]/5 text-[#00FF41]'
              : 'border-white/10 bg-white/5 text-white/30'
          }`}
        >
          {material.charAt(0)}
        </div>
        <div>
          <h4 className="font-bold text-xs uppercase">{label}</h4>
          <span className="text-[9px] text-white/20 font-mono uppercase tracking-widest">{date}</span>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-mono font-black text-sm ${isPositive ? 'text-[#00FF41]' : 'text-white/30'}`}>
          {amount} Kz
        </div>
        <span className="text-[8px] font-mono uppercase tracking-tighter opacity-30">{status}</span>
      </div>
    </div>
  );
}

/**
 * App.tsx — Prox-Recycle H0 Contest Edition
 * Auth: UUID stored in localStorage (no Firebase, no signup friction).
 * Data: All persistence via Vercel API routes → DynamoDB.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map as MapIcon, Camera, Wallet, Trophy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { fetchUser, type UserData, type Bounty } from './lib/api';

import MapView from './components/MapView';
import ScannerView from './components/ScannerView';
import WalletView from './components/WalletView';
import LeaderboardView from './components/LeaderboardView';
import SettingsView from './components/SettingsView';

const USER_ID_KEY = 'proxRecycleUserId';

function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

type Tab = 'map' | 'scan' | 'wallet' | 'leaderboard' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [userId] = useState<string>(getOrCreateUserId);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBounty, setActiveBounty] = useState<Bounty | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const data = await fetchUser(userId);
      setUserData(data);
    } catch (err) {
      console.error('Failed to load user:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleClaimStart = (bounty: Bounty) => {
    setActiveBounty(bounty);
    setActiveTab('scan');
  };

  const handleScanComplete = () => {
    setActiveBounty(null);
    loadUser();
    setActiveTab('wallet');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black font-mono">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-[#00FF41] text-4xl mb-4 font-black uppercase tracking-tighter italic"
        >
          ECO-BOUNTY
        </motion.div>
        <div className="text-[10px] text-white/30 uppercase tracking-[0.5em] animate-pulse">
          Syncing_AWS_Nodes...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] max-w-[480px] mx-auto border-x border-white/5 relative shadow-2xl">
      {/* Header */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-[#00FF41] rounded-lg flex items-center justify-center bg-[#00FF41]/5">
            <div className="w-5 h-5 border-[3px] border-[#00FF41] rounded-sm transform rotate-45" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tighter uppercase text-white leading-none">
              {userData?.displayName || 'Eco-Bounty'}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
              <p className="text-[8px] font-mono text-[#00FF41] uppercase leading-none">
                DynamoDB: Connected
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2">
          <p className="text-[8px] uppercase text-white/30 mb-0.5 leading-none font-bold tracking-widest">Balance</p>
          <p className="text-lg font-mono leading-none tracking-tighter text-[#00FF41]">
            {userData?.balance?.toLocaleString() ?? '0'}{' '}
            <span className="text-[10px] text-white/40 italic">Kz</span>
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <MapView userId={userId} onClaim={handleClaimStart} />
            </motion.div>
          )}
          {activeTab === 'scan' && (
            <motion.div
              key="scan"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="absolute inset-0 z-20"
            >
              <ScannerView
                userId={userId}
                activeBounty={activeBounty}
                onComplete={handleScanComplete}
              />
            </motion.div>
          )}
          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute inset-0"
            >
              <WalletView userData={userData} onOpenSettings={() => setActiveTab('settings')} />
            </motion.div>
          )}
          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0"
            >
              <LeaderboardView currentUserId={userId} />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="absolute inset-0 z-40 bg-[#0a0a0a]"
            >
              <SettingsView
                userId={userId}
                userData={userData}
                onBack={() => setActiveTab('wallet')}
                onUpdate={loadUser}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="h-20 bg-black/60 backdrop-blur-xl border-t border-white/10 px-8 flex items-center justify-between text-[10px] font-mono text-white/40 uppercase z-30">
        <div className="flex gap-10 items-center">
          <NavBtn
            active={activeTab === 'map'}
            onClick={() => setActiveTab('map')}
            icon={<MapIcon size={18} />}
            label="Map"
          />
          <NavBtn
            active={activeTab === 'wallet'}
            onClick={() => setActiveTab('wallet')}
            icon={<Wallet size={18} />}
            label="Base"
          />
        </div>

        {/* Centre scan button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-8">
          <div className="absolute inset-0 bg-[#00FF41]/20 blur-xl rounded-full" />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('scan')}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all border-2 border-white/20 bg-black/80 backdrop-blur-xl group"
          >
            <Camera
              size={28}
              className={`transition-colors ${
                activeTab === 'scan' ? 'text-[#00FF41]' : 'text-white/60 group-hover:text-[#00FF41]'
              }`}
            />
          </motion.button>
        </div>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 transition-colors ${
            activeTab === 'leaderboard' ? 'text-[#00FF41]' : 'hover:text-white'
          }`}
        >
          <Trophy size={14} className={activeTab === 'leaderboard' ? 'text-[#00FF41]' : 'text-white/20'} />
          <span className={`font-black ${activeTab === 'leaderboard' ? 'text-[#00FF41]' : ''}`}>
            LDR_BRD
          </span>
        </button>
      </nav>
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? 'text-[#00FF41]' : 'hover:text-white'
      }`}
    >
      {icon}
      <span className="text-[8px] font-bold">{label}</span>
    </button>
  );
}

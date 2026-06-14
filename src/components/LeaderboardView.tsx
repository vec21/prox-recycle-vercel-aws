import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal } from 'lucide-react';
import { fetchLeaderboard, type LeaderEntry } from '../lib/api';

interface LeaderboardViewProps {
  currentUserId: string;
}

export default function LeaderboardView({ currentUserId }: LeaderboardViewProps) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard()
      .then(setLeaders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col p-6 overflow-y-auto pb-32">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="p-2 rounded-xl bg-[#00FF41]/10 border border-[#00FF41]/20">
          <Trophy className="text-[#00FF41]" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tighter">Sector_Leaders</h2>
          <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
            Ranked_By_Total_Mass_Offset · DynamoDB
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {loading && (
          <div className="py-12 text-center text-white/20 font-mono text-xs uppercase tracking-widest animate-pulse">
            Querying_DynamoDB...
          </div>
        )}
        {!loading && leaders.length === 0 && (
          <div className="py-12 text-center text-white/20 font-mono text-xs uppercase tracking-widest">
            No_Agents_Yet. Be_The_First.
          </div>
        )}
        {leaders.map((leader, i) => (
          <motion.div
            key={leader.userId}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
              leader.userId === currentUserId
                ? 'bg-[#00FF41]/10 border-[#00FF41]/30'
                : i === 0
                ? 'bg-white/10 border-white/20'
                : 'bg-white/5 border-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                  i === 0
                    ? 'bg-[#00FF41] text-black'
                    : leader.userId === currentUserId
                    ? 'bg-[#00FF41]/20 text-[#00FF41]'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                {i + 1}
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase truncate max-w-[120px]">
                  {leader.displayName || `Agent-${leader.userId.slice(0, 6)}`}
                  {leader.userId === currentUserId && (
                    <span className="ml-1 text-[#00FF41] text-[8px]">▸ YOU</span>
                  )}
                </h4>
                <p className="text-[8px] text-white/30 font-mono uppercase tracking-wider">
                  Eco-Agent
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-black text-white/80">
                {leader.recycledWeight?.toFixed(1) ?? '0.0'}
              </div>
              <div className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Total_KG</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 p-6 rounded-[32px] border border-white/10 bg-[#00FF41]/5 relative overflow-hidden">
        <Medal className="text-[#00FF41] mb-4" size={32} />
        <h3 className="text-sm font-bold uppercase mb-2">Next_Tier_Unlock</h3>
        <p className="text-xs text-white/40 leading-relaxed font-medium">
          Reach 50 KG total mass to unlock the{' '}
          <span className="text-[#00FF41] italic">"Sector Guardian"</span> badge and 1.5x multiplier.
        </p>
      </div>
    </div>
  );
}

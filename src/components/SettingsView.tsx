import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Bell, User, Shield, RefreshCw, CheckCircle2 } from 'lucide-react';
import { updateUser, type UserData } from '../lib/api';

interface SettingsViewProps {
  userId: string;
  userData: UserData | null;
  onBack: () => void;
  onUpdate: () => void;
}

export default function SettingsView({ userId, userData, onBack, onUpdate }: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(userData?.displayName ?? '');
  const [notifications, setNotifications] = useState(userData?.notificationsEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await updateUser(userId, { displayName, notificationsEnabled: notifications });
      onUpdate();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col p-6 overflow-y-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tighter italic">Agent_Config</h2>
          <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
            Protocol_Identity_Settings
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Profile Section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="text-[#00FF41]" size={18} />
            <h3 className="text-xs font-mono font-black uppercase tracking-[0.2em] text-white/50">
              Identity_Matrix
            </h3>
          </div>
          <div>
            <label className="text-[8px] text-white/30 uppercase font-black mb-2 block tracking-widest leading-none">
              Display_Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Agent Name"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00FF41] outline-none transition-colors font-mono"
            />
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-[#00FF41]" size={18} />
            <h3 className="text-xs font-mono font-black uppercase tracking-[0.2em] text-white/50">
              Transmission_Alerts
            </h3>
          </div>
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
            <div>
              <h4 className="text-sm font-bold uppercase">Push_Intel</h4>
              <p className="text-[10px] text-white/30 font-mono mt-1">Bounty Surge &amp; Payout Alerts</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                notifications ? 'bg-[#00FF41]' : 'bg-white/10'
              }`}
            >
              <motion.div
                animate={{ x: notifications ? 26 : 2 }}
                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-[#00FF41]" size={18} />
            <h3 className="text-xs font-mono font-black uppercase tracking-[0.2em] text-white/50">
              System_Invariants
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-[10px] font-mono text-white/30 uppercase">Protocol_Version</span>
              <span className="text-[10px] font-mono text-[#00FF41]">2.0.0-Vercel-AWS</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-[10px] font-mono text-white/30 uppercase">Data_Layer</span>
              <span className="text-[10px] font-mono text-[#00FF41]">DynamoDB</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[10px] font-mono text-white/30 uppercase">Agent_ID</span>
              <span className="text-[10px] font-mono text-white/60 truncate max-w-[140px]">
                {userId.slice(0, 18)}…
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-2 transition-all shadow-[0_10px_40px_rgba(0,255,65,0.1)] ${
            success
              ? 'bg-green-500 text-white'
              : 'bg-[#00FF41] text-black hover:brightness-110 active:scale-95'
          } disabled:opacity-50`}
        >
          {saving ? (
            <RefreshCw className="animate-spin" size={20} />
          ) : success ? (
            <>
              <CheckCircle2 size={20} />
              Protocol_Updated
            </>
          ) : (
            <>
              <Save size={20} />
              COMMIT_CONFIG
            </>
          )}
        </button>
      </div>
    </div>
  );
}

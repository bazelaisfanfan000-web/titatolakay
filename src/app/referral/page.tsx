"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

import { motion } from "framer-motion";

import { 
  Gift, 
  Copy, 
  Share2, 
  Users, 
  TrendingUp,
  Check,
  X
} from "lucide-react";

export default function ReferralPage() {
  const router = useRouter();
  const user = auth.currentUser;

  const [referralCode, setReferralCode] = useState<string>("");
  const [referralLink, setReferralLink] = useState<string>("");
  const [referralCount, setReferralCount] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [recentRewards, setRecentRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Récupérer le code de parrainage
    const userRef = ref(database, `users/${user.uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const code = data.referralCode || "";
        setReferralCode(code);
        setReferralCount(data.referralCount || 0);
        
        if (code) {
          setReferralLink(`${window.location.origin}/register?ref=${code}`);
        } else {
          // Générer automatiquement un code si l'utilisateur n'en a pas
          generateCode();
        }
      }
      setLoading(false);
    });

    // Récupérer les récompenses de parrainage
    const rewardsRef = ref(database, `referralRewards`);
    onValue(rewardsRef, (snapshot) => {
      const rewards: any[] = [];
      let total = 0;
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const reward = child.val();
          if (reward.referrerId === user.uid) {
            rewards.push(reward);
            total += reward.commissionAmount;
          }
        });
      }
      
      // Trier par date décroissante
      rewards.sort((a, b) => b.createdAt - a.createdAt);
      rewards.splice(10); // Garder les 10 plus récents
      
      setRecentRewards(rewards);
      setTotalEarnings(total);
    });
  }, [user, router]);

  // Générer un code de parrainage si l'utilisateur n'en a pas
  const generateCode = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch("/api/referral/create-code", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setReferralCode(data.code);
        setReferralLink(data.referralLink);
      }
    } catch (error) {
      console.error("Erreur génération code:", error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erreur copie:", error);
    }
  };

  const shareWhatsApp = () => {
    const message = `🎮 Rejoins-moi sur WinCash.\nJoue et gagne.\nMon lien : ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(url, "_blank");
  };

  const shareTelegram = () => {
    const message = `🎮 Rejoins-moi sur WinCash.\nJoue et gagne.\nMon lien : ${referralLink}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-HT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-3 text-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-[10px] text-white/30">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#05070b] px-3 pb-20 pt-4 text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[350px]"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl"
          >
            <X size={14} className="text-white/50" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/10 bg-blue-500/[0.06]">
              <Gift size={14} className="text-blue-400" />
            </div>
            <span className="text-[10px] font-black tracking-[0.15em] text-blue-400">
              PARRAINAGE
            </span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <Users size={12} className="text-blue-400" />
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">
                Invités
              </span>
            </div>
            <p className="text-2xl font-black">{referralCount}</p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={12} className="text-green-400" />
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">
                Gains
              </span>
            </div>
            <p className="text-2xl font-black text-green-400">{totalEarnings} HTG</p>
          </div>
        </div>

        {/* Referral link card */}
        <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-2">
            Mon lien de parrainage
          </p>

          <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
            <p className="flex-1 truncate text-[9px] text-white/70">
              {referralLink || "Génération en cours..."}
            </p>
            <button
              onClick={copyToClipboard}
              disabled={!referralLink}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/[0.1] transition-all hover:bg-blue-500/[0.2] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? (
                <Check size={12} className="text-green-400" />
              ) : (
                <Copy size={12} className="text-blue-400" />
              )}
            </button>
          </div>

          <p className="text-[8px] leading-3 text-white/30 text-center">
            Les commissions de 10% sont créditées automatiquement sur votre solde principal après chaque perte validée d'un joueur invité.
          </p>
        </div>

        {/* Share buttons */}
        <div className="mb-4">
          <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-3">
            Partager
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={shareWhatsApp}
              disabled={!referralLink}
              className="flex h-12 flex-col items-center justify-center rounded-xl border border-green-500/20 bg-green-500/[0.08] transition-all hover:bg-green-500/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg mb-1">💬</span>
              <span className="text-[7px] font-bold text-green-400">WhatsApp</span>
            </button>

            <button
              onClick={shareFacebook}
              disabled={!referralLink}
              className="flex h-12 flex-col items-center justify-center rounded-xl border border-blue-600/20 bg-blue-600/[0.08] transition-all hover:bg-blue-600/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg mb-1">📘</span>
              <span className="text-[7px] font-bold text-blue-400">Facebook</span>
            </button>

            <button
              onClick={shareTelegram}
              disabled={!referralLink}
              className="flex h-12 flex-col items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/[0.08] transition-all hover:bg-sky-500/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg mb-1">✈️</span>
              <span className="text-[7px] font-bold text-sky-400">Telegram</span>
            </button>
          </div>
        </div>

        {/* Recent rewards */}
        {recentRewards.length > 0 && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-3">
              Historique des gains
            </p>

            <div className="space-y-2">
              {recentRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-green-400">
                      +{reward.commissionAmount} HTG
                    </p>
                    <p className="text-[7px] text-white/30">
                      Commission parrainage
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-white/50">
                      {formatDate(reward.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </main>
  );
}

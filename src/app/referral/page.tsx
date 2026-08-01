"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

import { motion, AnimatePresence } from "framer-motion";

import { 
  Gift, 
  Copy, 
  Share2, 
  Users, 
  TrendingUp,
  Check,
  X,
  Clock,
  DollarSign,
  QrCode,
  Download,
  ArrowRight,
  Sparkles,
  Zap,
  MessageCircle,
  Send,
  Mail,
  Share,
  Calendar,
  User,
  AlertCircle
} from "lucide-react";

export default function ReferralPage() {
  const router = useRouter();
  const user = auth.currentUser;

  const [referralCode, setReferralCode] = useState<string>("");
  const [referralLink, setReferralLink] = useState<string>("");
  const [referralCount, setReferralCount] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [activeReferrals, setActiveReferrals] = useState<number>(0);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [recentRewards, setRecentRewards] = useState<any[]>([]);
  const [referralUsers, setReferralUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

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
        
        if (code) {
          const link = `${window.location.origin}/register?ref=${code}`;
          setReferralLink(link);
          setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`);
        } else {
          generateCode();
        }
      }
      setLoading(false);
    });

    // Récupérer les statistiques de parrainage dynamiquement
    const fetchReferralStats = async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          
          // Comptage dynamique des filleuls
          const countResponse = await fetch("/api/referral/count", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const countData = await countResponse.json();
          if (countData.success) {
            setReferralCount(countData.count);
          }
          
          // Statistiques détaillées
          const statsResponse = await fetch("/api/referral/stats", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setTotalEarnings(statsData.stats.totalEarnings);
            setActiveReferrals(statsData.stats.activeReferrals);
            setTodayEarnings(statsData.stats.todayEarnings);
          }
          
          // Liste des filleuls
          const referralsResponse = await fetch("/api/referral/referrals", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const referralsData = await referralsResponse.json();
          if (referralsData.success) {
            setReferralUsers(referralsData.referrals);
          }
          
          // Historique des commissions (utiliser Firebase client SDK)
          const rewardsRef = ref(database, `referralRewards`);
          onValue(rewardsRef, (snapshot) => {
            const rewards: any[] = [];
            if (snapshot.exists()) {
              snapshot.forEach((child) => {
                const reward = child.val();
                if (reward.referrerId === user.uid) {
                  rewards.push(reward);
                }
              });
            }
            rewards.sort((a, b) => b.createdAt - a.createdAt);
            setRecentRewards(rewards.slice(0, 50));
          });
        } catch (error) {
          console.error("[REFERRAL_PAGE] Erreur récupération stats:", error);
        }
      }
    };
    
    fetchReferralStats();
    
    // Rafraîchir les stats toutes les 30 secondes
    const interval = setInterval(fetchReferralStats, 30000);
    
    return () => clearInterval(interval);
  }, [user, router]);

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
        const link = `${window.location.origin}/register?ref=${data.code}`;
        setReferralLink(link);
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`);
      }
    } catch (error) {
      console.error("Erreur génération code:", error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setShowToast(true);
      setTimeout(() => {
        setCopied(false);
        setShowToast(false);
      }, 2000);
    } catch (error) {
      console.error("Erreur copie:", error);
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'wincash-qr-code.png';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareWhatsApp = () => {
    const message = `🎮 Rejoins-moi sur WinCash et gagne de l'argent !\n\nInvitez vos amis et gagnez automatiquement 10% de leurs pertes pendant 6 mois.\n\nMon lien : ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent("Gagnez de l'argent sur WinCash !")}`;
    window.open(url, "_blank");
  };

  const shareTelegram = () => {
    const message = `🎮 Rejoins-moi sur WinCash !\n\nInvitez vos amis et gagnez automatiquement 10% de leurs pertes pendant 6 mois.\n\nMon lien : ${referralLink}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const shareTwitter = () => {
    const message = `🎮 Rejoins-moi sur WinCash ! Gagnez automatiquement 10% des pertes de vos amis pendant 6 mois. ${referralLink}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const shareEmail = () => {
    const subject = "Gagnez de l'argent sur WinCash !";
    const body = `Salut !\n\nJe t'invite à rejoindre WinCash, un jeu où tu peux gagner de l'argent.\n\nEn plus, si tu t'inscris via mon lien, je gagnerai automatiquement 10% de tes pertes pendant 6 mois.\n\nMon lien : ${referralLink}\n\nÀ bientôt !`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "WinCash - Gagnez de l'argent",
          text: "Invitez vos amis et gagnez automatiquement 10% de leurs pertes pendant 6 mois !",
          url: referralLink
        });
      } catch (error) {
        console.error("Erreur partage natif:", error);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-HT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getTimeRemaining = (referralEndDate: number) => {
    const now = Date.now();
    const remaining = referralEndDate - now;
    
    if (remaining <= 0) return "Expiré";
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    
    if (months > 0) return `${months} mois`;
    return `${days} jours`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-HT");
  };

  const StatCard = ({ icon: Icon, label, value, color, delay }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-xl sm:rounded-2xl sm:p-4"
    >
      <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br ${color} opacity-10 blur-xl sm:-right-4 sm:-top-4 sm:h-20 sm:w-20`} />
      <div className="relative">
        <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${color} sm:h-8 sm:w-8 sm:rounded-xl`}>
            <Icon size={14} className="text-white sm:size-16" />
          </div>
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider sm:text-[10px]">
            {label}
          </span>
        </div>
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.2, type: "spring" }}
          className="text-2xl font-black sm:text-3xl"
        >
          {typeof value === "number" ? formatNumber(value) : value}
        </motion.p>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-3 text-white">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-3 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-sm text-white/30">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#05070b] px-3 pb-20 pt-4 text-white sm:px-4 sm:pb-24 sm:pt-6">
      {/* Background effects */}
      <div className="pointer-events-none absolute left-1/2 top-[-150px] h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px] sm:top-[-200px] sm:h-[400px] sm:w-[400px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[200px] w-[200px] rounded-full bg-purple-600/10 blur-[100px] sm:h-[300px] sm:w-[300px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl transition-all hover:bg-white/[0.05] sm:h-10 sm:w-10"
          >
            <X size={18} className="text-white/50 sm:size-20" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/[0.1] sm:h-10 sm:w-10">
              <Gift size={18} className="text-purple-400 sm:size-20" />
            </div>
            <span className="text-xs font-black tracking-[0.15em] text-purple-400 sm:text-sm">
              PARRAINAGE
            </span>
          </div>
        </div>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 overflow-hidden rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.15] to-blue-500/[0.15] p-4 backdrop-blur-xl sm:mb-8 sm:rounded-3xl sm:p-6"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/[0.2] sm:h-16 sm:w-16 sm:rounded-2xl">
              <Sparkles size={24} className="text-purple-300 sm:size-32" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-black leading-tight sm:text-xl">
                🎁 Parrainage WinCash
              </h1>
              <p className="mt-1 text-xs text-purple-200/80 sm:mt-1 sm:text-sm">
                Invitez vos amis et gagnez automatiquement <span className="font-bold text-purple-300">10 % de leurs pertes</span> pendant <span className="font-bold text-purple-300">6 mois</span>.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4">
          <StatCard
            icon={Users}
            label="Invités"
            value={referralCount}
            color="from-blue-500 to-blue-600"
            delay={0.2}
          />
          <StatCard
            icon={DollarSign}
            label="Gains"
            value={`${totalEarnings} HTG`}
            color="from-green-500 to-green-600"
            delay={0.3}
          />
          <StatCard
            icon={Clock}
            label="Filleuls actifs"
            value={activeReferrals}
            color="from-purple-500 to-purple-600"
            delay={0.4}
          />
          <StatCard
            icon={TrendingUp}
            label="Aujourd'hui"
            value={`${todayEarnings} HTG`}
            color="from-orange-500 to-orange-600"
            delay={0.5}
          />
        </div>

        {/* Referral Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-5 overflow-hidden rounded-2xl border border-blue-400/20 bg-blue-500/[0.05] p-4 backdrop-blur-xl sm:mb-6 sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <Share2 size={18} className="text-blue-400 sm:size-20" />
            <h2 className="text-xs font-bold text-blue-100 sm:text-sm">Mon lien personnel</h2>
          </div>
          
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/[0.05] px-3 py-2.5 sm:mb-4 sm:px-4 sm:py-3">
            <p className="flex-1 truncate text-xs text-blue-100/80 sm:text-sm">
              {referralLink || "Génération en cours..."}
            </p>
            <button
              onClick={copyToClipboard}
              disabled={!referralLink}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/[0.1] transition-all hover:bg-blue-500/[0.2] disabled:opacity-50 disabled:cursor-not-allowed sm:h-10 sm:w-10"
            >
              {copied ? (
                <Check size={16} className="text-green-400 sm:size-20" />
              ) : (
                <Copy size={16} className="text-blue-400 sm:size-20" />
              )}
            </button>
          </div>

          <button
            onClick={copyToClipboard}
            disabled={!referralLink}
            className="w-full rounded-xl border border-blue-400/30 bg-blue-500/[0.1] px-4 py-2.5 text-xs font-bold text-blue-100 transition-all hover:bg-blue-500/[0.2] disabled:opacity-50 disabled:cursor-not-allowed sm:py-3 sm:text-sm"
          >
            📋 Copier le lien
          </button>
        </motion.div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl sm:mb-6 sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <QrCode size={18} className="text-white/60 sm:size-20" />
            <h2 className="text-xs font-bold text-white/80 sm:text-sm">QR Code</h2>
          </div>
          
          {qrCodeUrl && (
            <div className="mb-3 flex justify-center sm:mb-4">
              <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-white p-2">
                <img src={qrCodeUrl} alt="QR Code" className="h-32 w-32 sm:h-40 sm:w-40" />
              </div>
            </div>
          )}

          <button
            onClick={downloadQRCode}
            disabled={!qrCodeUrl}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-white/80 transition-all hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed sm:py-3 sm:text-sm"
          >
            <Download size={16} />
            Télécharger le QR Code
          </button>
        </motion.div>

        {/* Share Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-5 sm:mb-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <Share2 size={18} className="text-white/60 sm:size-20" />
            <h2 className="text-xs font-bold text-white/80 sm:text-sm">Partager</h2>
          </div>

          {/* Native share on mobile */}
          {typeof window !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={nativeShare}
              disabled={!referralLink}
              className="mb-3 w-full flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/[0.1] px-4 py-2.5 text-xs font-bold text-blue-100 transition-all hover:bg-blue-500/[0.2] disabled:opacity-50 disabled:cursor-not-allowed sm:py-3 sm:text-sm"
            >
              <Share size={16} />
              Partager
            </button>
          )}

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={shareWhatsApp}
              disabled={!referralLink}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-green-500/20 bg-green-500/[0.05] p-2.5 transition-all hover:bg-green-500/[0.1] disabled:opacity-50 disabled:cursor-not-allowed sm:gap-2 sm:p-3"
            >
              <MessageCircle size={20} className="text-green-400 sm:size-24" />
              <span className="text-[9px] font-bold text-green-400 sm:text-[10px]">WhatsApp</span>
            </button>

            <button
              onClick={shareFacebook}
              disabled={!referralLink}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-blue-600/20 bg-blue-600/[0.05] p-2.5 transition-all hover:bg-blue-600/[0.1] disabled:opacity-50 disabled:cursor-not-allowed sm:gap-2 sm:p-3"
            >
              <Share2 size={20} className="text-blue-400 sm:size-24" />
              <span className="text-[9px] font-bold text-blue-400 sm:text-[10px]">Facebook</span>
            </button>

            <button
              onClick={shareTelegram}
              disabled={!referralLink}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-2.5 transition-all hover:bg-sky-500/[0.1] disabled:opacity-50 disabled:cursor-not-allowed sm:gap-2 sm:p-3"
            >
              <Send size={20} className="text-sky-400 sm:size-24" />
              <span className="text-[9px] font-bold text-sky-400 sm:text-[10px]">Telegram</span>
            </button>

            <button
              onClick={shareTwitter}
              disabled={!referralLink}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-500/20 bg-gray-500/[0.05] p-2.5 transition-all hover:bg-gray-500/[0.1] disabled:opacity-50 disabled:cursor-not-allowed sm:gap-2 sm:p-3"
            >
              <Share2 size={20} className="text-gray-400 sm:size-24" />
              <span className="text-[9px] font-bold text-gray-400 sm:text-[10px]">X</span>
            </button>

            <button
              onClick={shareEmail}
              disabled={!referralLink}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-orange-500/20 bg-orange-500/[0.05] p-2.5 transition-all hover:bg-orange-500/[0.1] disabled:opacity-50 disabled:cursor-not-allowed sm:gap-2 sm:p-3"
            >
              <Mail size={20} className="text-orange-400 sm:size-24" />
              <span className="text-[9px] font-bold text-orange-400 sm:text-[10px]">Email</span>
            </button>

            <button
              onClick={copyToClipboard}
              disabled={!referralLink}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-blue-400/20 bg-blue-500/[0.05] p-2.5 transition-all hover:bg-blue-500/[0.1] disabled:opacity-50 disabled:cursor-not-allowed sm:gap-2 sm:p-3"
            >
              <Copy size={20} className="text-blue-400 sm:size-24" />
              <span className="text-[9px] font-bold text-blue-400 sm:text-[10px]">Copier</span>
            </button>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl sm:mb-6 sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <Zap size={18} className="text-yellow-400 sm:size-20" />
            <h2 className="text-xs font-bold text-white/80 sm:text-sm">Comment fonctionne le parrainage ?</h2>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {[
              { icon: Share2, text: "Partagez votre lien avec vos amis" },
              { icon: User, text: "Votre ami crée un compte via votre lien" },
              { icon: Gift, text: "Il joue sur WinCash" },
              { icon: Clock, text: "Pendant 6 mois, vous recevez automatiquement 10% de ses pertes" },
              { icon: DollarSign, text: "Les commissions sont créditées sur votre solde principal" }
            ].map((step, index) => (
              <div key={index} className="flex items-start gap-2.5 sm:gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.05] sm:h-8 sm:w-8">
                  <step.icon size={14} className="text-white/60 sm:size-16" />
                </div>
                <p className="flex-1 text-xs text-white/60 sm:text-sm">{step.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Commission History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mb-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl sm:mb-6 sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-400 sm:size-20" />
            <h2 className="text-xs font-bold text-white/80 sm:text-sm">Historique des commissions</h2>
          </div>

          {recentRewards.length > 0 ? (
            <div className="space-y-2">
              {recentRewards.slice(0, 5).map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 sm:px-4 sm:py-3"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-400/20 bg-green-500/[0.1] sm:h-10 sm:w-10">
                      <DollarSign size={16} className="text-green-400 sm:size-18" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-400 sm:text-sm">
                        +{reward.commissionAmount} HTG
                      </p>
                      <p className="text-[10px] text-white/40 sm:text-xs">
                        {formatDate(reward.createdAt)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-white/20 sm:size-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center sm:py-8">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.02] sm:h-16 sm:w-16">
                <TrendingUp size={28} className="text-white/20 sm:size-32" />
              </div>
              <p className="text-xs text-white/40 sm:text-sm">Aucune commission pour le moment</p>
              <p className="mt-1 text-[10px] text-white/30 sm:text-xs">Partagez votre lien pour commencer à gagner</p>
            </div>
          )}
        </motion.div>

        {/* Referral Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <Users size={18} className="text-blue-400 sm:size-20" />
            <h2 className="text-xs font-bold text-white/80 sm:text-sm">Mes filleuls</h2>
          </div>

          {referralUsers.length > 0 ? (
            <div className="space-y-2">
              {referralUsers.map((userData) => {
                const isActive = Date.now() <= (userData.referralEndDate || 0);
                return (
                  <div
                    key={userData.uid}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 sm:px-4 sm:py-3"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-gradient-to-br from-blue-500/[0.2] to-purple-500/[0.2] sm:h-10 sm:w-10">
                        <User size={16} className="text-white/60 sm:size-18" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white/80 sm:text-sm">
                          {userData.username || "Utilisateur"}
                        </p>
                        <p className="text-[10px] text-white/40 sm:text-xs">
                          {formatDate(userData.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full sm:text-[10px] sm:px-2 sm:py-1 ${isActive ? 'bg-green-500/[0.2] text-green-400' : 'bg-orange-500/[0.2] text-orange-400'}`}>
                        {isActive ? 'Actif' : 'Expiré'}
                      </span>
                      <span className="text-[10px] text-white/40 sm:text-xs">
                        {getTimeRemaining(userData.referralEndDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.02]">
                <Users size={32} className="text-white/20" />
              </div>
              <p className="text-sm text-white/40">Aucun filleul pour le moment</p>
              <p className="mt-1 text-xs text-white/30">Invitez vos amis pour commencer à gagner</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Toast notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-green-400/30 bg-green-500/[0.15] px-6 py-4 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <Check size={20} className="text-green-400" />
              <p className="text-sm font-bold text-green-100">Lien copié avec succès !</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

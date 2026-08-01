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
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur-xl"
    >
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${color} opacity-10 blur-xl`} />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${color}`}>
            <Icon size={16} className="text-white" />
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.2, type: "spring" }}
          className="text-3xl font-black"
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
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#05070b] px-4 pb-24 pt-6 text-white">
      {/* Background effects */}
      <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl transition-all hover:bg-white/[0.05]"
          >
            <X size={20} className="text-white/50" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/[0.1]">
              <Gift size={20} className="text-purple-400" />
            </div>
            <span className="text-sm font-black tracking-[0.15em] text-purple-400">
              PARRAINAGE
            </span>
          </div>
        </div>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 overflow-hidden rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.15] to-blue-500/[0.15] p-6 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/[0.2]">
              <Sparkles size={32} className="text-purple-300" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black leading-tight">
                🎁 Parrainage WinCash
              </h1>
              <p className="mt-1 text-sm text-purple-200/80">
                Invitez vos amis et gagnez automatiquement <span className="font-bold text-purple-300">10 % de leurs pertes</span> pendant <span className="font-bold text-purple-300">6 mois</span>.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4">
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
          className="mb-6 overflow-hidden rounded-2xl border border-blue-400/20 bg-blue-500/[0.08] p-5 backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center gap-2">
            <Share2 size={20} className="text-blue-400" />
            <h2 className="text-sm font-bold text-blue-100">Mon lien personnel</h2>
          </div>
          
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/[0.05] px-4 py-3">
            <p className="flex-1 truncate text-sm text-blue-100/80">
              {referralLink || "Génération en cours..."}
            </p>
            <button
              onClick={copyToClipboard}
              disabled={!referralLink}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/[0.15] transition-all hover:bg-blue-500/[0.25] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? (
                <Check size={20} className="text-green-400" />
              ) : (
                <Copy size={20} className="text-blue-400" />
              )}
            </button>
          </div>

          <button
            onClick={copyToClipboard}
            disabled={!referralLink}
            className="w-full rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-500/[0.2] to-blue-600/[0.2] px-4 py-3 text-sm font-bold text-blue-100 transition-all hover:from-blue-500/[0.3] hover:to-blue-600/[0.3] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📋 Copier le lien
          </button>
        </motion.div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center gap-2">
            <QrCode size={20} className="text-white/60" />
            <h2 className="text-sm font-bold text-white/80">QR Code</h2>
          </div>
          
          {qrCodeUrl && (
            <div className="mb-4 flex justify-center">
              <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-white p-2">
                <img src={qrCodeUrl} alt="QR Code" className="h-40 w-40" />
              </div>
            </div>
          )}

          <button
            onClick={downloadQRCode}
            disabled={!qrCodeUrl}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/80 transition-all hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Télécharger le QR Code
          </button>
        </motion.div>

        {/* Share Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <Share2 size={20} className="text-white/60" />
            <h2 className="text-sm font-bold text-white/80">Partager</h2>
          </div>

          {/* Native share on mobile */}
          {typeof window !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={nativeShare}
              disabled={!referralLink}
              className="mb-3 w-full flex items-center justify-center gap-2 rounded-xl border border-purple-400/30 bg-gradient-to-r from-purple-500/[0.2] to-pink-500/[0.2] px-4 py-3 text-sm font-bold text-purple-100 transition-all hover:from-purple-500/[0.3] hover:to-pink-500/[0.3] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share size={18} />
              Partager
            </button>
          )}

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={shareWhatsApp}
              disabled={!referralLink}
              className="flex flex-col items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/[0.08] p-3 transition-all hover:bg-green-500/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle size={24} className="text-green-400" />
              <span className="text-[10px] font-bold text-green-400">WhatsApp</span>
            </button>

            <button
              onClick={shareFacebook}
              disabled={!referralLink}
              className="flex flex-col items-center gap-2 rounded-xl border border-blue-600/20 bg-blue-600/[0.08] p-3 transition-all hover:bg-blue-600/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 size={24} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400">Facebook</span>
            </button>

            <button
              onClick={shareTelegram}
              disabled={!referralLink}
              className="flex flex-col items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.08] p-3 transition-all hover:bg-sky-500/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={24} className="text-sky-400" />
              <span className="text-[10px] font-bold text-sky-400">Telegram</span>
            </button>

            <button
              onClick={shareTwitter}
              disabled={!referralLink}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-500/20 bg-gray-500/[0.08] p-3 transition-all hover:bg-gray-500/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 size={24} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400">X</span>
            </button>

            <button
              onClick={shareEmail}
              disabled={!referralLink}
              className="flex flex-col items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.08] p-3 transition-all hover:bg-orange-500/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail size={24} className="text-orange-400" />
              <span className="text-[10px] font-bold text-orange-400">Email</span>
            </button>

            <button
              onClick={copyToClipboard}
              disabled={!referralLink}
              className="flex flex-col items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/[0.08] p-3 transition-all hover:bg-blue-500/[0.15] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy size={24} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400">Copier</span>
            </button>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <Zap size={20} className="text-yellow-400" />
            <h2 className="text-sm font-bold text-white/80">Comment fonctionne le parrainage ?</h2>
          </div>

          <div className="space-y-3">
            {[
              { icon: Share2, text: "Partagez votre lien avec vos amis" },
              { icon: User, text: "Votre ami crée un compte via votre lien" },
              { icon: Gift, text: "Il joue sur WinCash" },
              { icon: Clock, text: "Pendant 6 mois, vous recevez automatiquement 10% de ses pertes" },
              { icon: DollarSign, text: "Les commissions sont créditées sur votre solde principal" }
            ].map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.05]">
                  <step.icon size={16} className="text-white/60" />
                </div>
                <p className="flex-1 text-sm text-white/60">{step.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Commission History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-400" />
            <h2 className="text-sm font-bold text-white/80">Historique des commissions</h2>
          </div>

          {recentRewards.length > 0 ? (
            <div className="space-y-2">
              {recentRewards.slice(0, 5).map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-400/20 bg-green-500/[0.1]">
                      <DollarSign size={18} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-400">
                        +{reward.commissionAmount} HTG
                      </p>
                      <p className="text-xs text-white/40">
                        {formatDate(reward.createdAt)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-white/20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.02]">
                <TrendingUp size={32} className="text-white/20" />
              </div>
              <p className="text-sm text-white/40">Aucune commission pour le moment</p>
              <p className="mt-1 text-xs text-white/30">Partagez votre lien pour commencer à gagner</p>
            </div>
          )}
        </motion.div>

        {/* Referral Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-400" />
            <h2 className="text-sm font-bold text-white/80">Mes filleuls</h2>
          </div>

          {referralUsers.length > 0 ? (
            <div className="space-y-2">
              {referralUsers.map((userData) => {
                const isActive = Date.now() <= (userData.referralEndDate || 0);
                return (
                  <div
                    key={userData.uid}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-gradient-to-br from-blue-500/[0.2] to-purple-500/[0.2]">
                        <User size={18} className="text-white/60" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/80">
                          {userData.username || "Utilisateur"}
                        </p>
                        <p className="text-xs text-white/40">
                          {formatDate(userData.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isActive ? 'bg-green-500/[0.2] text-green-400' : 'bg-orange-500/[0.2] text-orange-400'}`}>
                        {isActive ? 'Actif' : 'Expiré'}
                      </span>
                      <span className="text-xs text-white/40">
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

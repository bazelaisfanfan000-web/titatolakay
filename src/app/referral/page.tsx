"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const userRef = ref(database, `users/${user.uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const code = data.referralCode || "";
        setReferralCode(code);
        
        if (code) {
          const link = `https://wincash.vercel.app/register?ref=${code}`;
          setReferralLink(link);
          setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`);
        } else {
          generateCode();
        }
      }
      setLoading(false);
    });

    const fetchReferralStats = async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          
          const countResponse = await fetch("/api/referral/count", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const countData = await countResponse.json();
          if (countData.success) {
            setReferralCount(countData.count);
          }
          
          const statsResponse = await fetch("/api/referral/stats", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setTotalEarnings(statsData.stats.totalEarnings);
            setActiveReferrals(statsData.stats.activeReferrals);
            setTodayEarnings(statsData.stats.todayEarnings);
          }
          
          const referralsResponse = await fetch("/api/referral/referrals", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const referralsData = await referralsResponse.json();
          if (referralsData.success) {
            setReferralUsers(referralsData.referrals);
          }
          
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
        const link = `https://wincash.vercel.app/register?ref=${data.code}`;
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
      setTimeout(() => {
        setCopied(false);
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

  if (loading) {
    return (
      <main
        className="
          relative
          min-h-screen
          overflow-hidden
          bg-[#020617]
          text-white
        "
      >
        <div
          className="
            pointer-events-none
            fixed
            -left-24
            top-20
            h-64
            w-64
            rounded-full
            bg-blue-600/10
            blur-3xl
          "
        />
        <div
          className="
            pointer-events-none
            fixed
            -right-24
            bottom-24
            h-64
            w-64
            rounded-full
            bg-purple-600/10
            blur-3xl
          "
        />
        <div
          className="
            flex
            min-h-screen
            items-center
            justify-center
          "
        >
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
            <p className="text-[10px] text-white/30">Chargement...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#020617]
        text-white
      "
    >

      {/* ==========================================
          DÉCORATIONS
      ========================================== */}

      <div
        className="
          pointer-events-none
          fixed
          -left-24
          top-20
          h-64
          w-64
          rounded-full
          bg-blue-600/10
          blur-3xl
        "
      />


      <div
        className="
          pointer-events-none
          fixed
          -right-24
          bottom-24
          h-64
          w-64
          rounded-full
          bg-purple-600/10
          blur-3xl
        "
      />


      {/* ==========================================
          CONTENEUR MOBILE
      ========================================== */}

      <div
        className="
          relative
          mx-auto
          min-h-screen
          w-full
          max-w-[430px]
          overflow-x-hidden
          pb-28
        "
      >

        {/* ========================================
            HEADER FIXE
        ======================================== */}

        <header
          className="
            fixed
            left-0
            right-0
            top-0
            z-50
            border-b
            border-white/[0.08]
            bg-[#020617]/95
            backdrop-blur-2xl
          "
        >

          <div
            className="
              mx-auto
              flex
              h-[64px]
              w-full
              max-w-[430px]
              items-center
              justify-between
              px-4
            "
          >

            {/* LOGO */}

            <div
              className="
                flex
                min-w-0
                flex-1
                flex-col
                justify-center
              "
            >

              <h1
                className="
                  text-[17px]
                  font-black
                  leading-none
                  tracking-tight
                  text-white
                "
              >

                Wincash

              </h1>


              <p
                className="
                  mt-1
                  text-[8px]
                  font-medium
                  leading-none
                  text-white/35
                "
              >

                Jouez. Défilez. Gagnez.

              </p>

            </div>

            {/* RETOUR */}

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="
                flex
                h-[38px]
                min-w-[38px]
                items-center
                justify-center
                rounded-xl
                border
                border-white/[0.08]
                bg-white/[0.05]
                px-3
                text-center
                backdrop-blur-md
                transition-all
                hover:bg-white/[0.08]
              "
            >
              ❌
            </button>

          </div>

        </header>


        {/* ========================================
            CONTENU
        ======================================== */}

        <div
          className="
            px-4
            pb-10
            pt-[88px]
          "
        >

          {/* ======================================
              SALUTATION
          ====================================== */}

          <section>

            <p
              className="
                text-[10px]
                font-medium
                text-white/35
              "
            >

              Salut 👋

            </p>


            <h2
              className="
                mt-1
                text-[23px]
                font-black
                tracking-tight
              "
            >

              Parrainage

            </h2>

          </section>


          {/* ======================================
              BANNER PARRAINAGE
          ====================================== */}

          <section
            className="
              mt-5
              overflow-hidden
              rounded-2xl
              border
              border-purple-400/30
              bg-purple-500/[0.10]
              px-4
              py-3.5
              shadow-[0_4px_0_rgba(168,85,247,0.65),0_0_18px_rgba(168,85,247,0.08)]
              backdrop-blur-md
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-purple-300/25
                  bg-purple-400/[0.10]
                  text-lg
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                "
              >

                🎁

              </div>


              <div
                className="
                  min-w-0
                  flex-1
                "
              >

                <h4
                  className="
                    text-[13px]
                    font-black
                    leading-tight
                    text-purple-100
                  "
                >

                  🎁 Parrainage WinCash

                </h4>


                <p
                  className="
                    mt-1
                    text-[9px]
                    leading-tight
                    text-purple-100/60
                  "
                >

                  Invitez vos amis et gagnez automatiquement <span className="text-purple-300 font-bold">10 % de leurs pertes</span> pendant <span className="text-purple-300 font-bold">6 mois</span>.

                </p>

              </div>

            </div>

          </section>


          {/* ======================================
              STATISTIQUES
          ====================================== */}

          <section
            className="
              mt-5
              grid
              grid-cols-2
              overflow-hidden
              rounded-xl
              border
              border-white/[0.07]
              bg-white/[0.025]
            "
          >

            {/* INVITÉS */}

            <div
              className="
                border-r
                border-white/[0.06]
                px-1
                py-2.5
                text-center
              "
            >

              <div
                className="
                  text-sm
                  leading-none
                "
              >

                👥

              </div>


              <p
                className="
                  mt-1
                  text-[13px]
                  font-black
                  leading-none
                "
              >

                {referralCount}

              </p>


              <p
                className="
                  mt-1
                  text-[7px]
                  leading-none
                  text-white/30
                "
              >

                Invités

              </p>

            </div>


            {/* GAINS */}

            <div
              className="
                px-1
                py-2.5
                text-center
              "
            >

              <div
                className="
                  text-sm
                  leading-none
                "
              >

                💰

              </div>


              <p
                className="
                  mt-1
                  text-[13px]
                  font-black
                  leading-none
                  text-green-400
                "
              >

                {totalEarnings} HTG

              </p>


              <p
                className="
                  mt-1
                  text-[7px]
                  leading-none
                  text-white/30
                "
              >

                Gains

              </p>

            </div>


            {/* FILLEULS ACTIFS */}

            <div
              className="
                border-r
                border-white/[0.06]
                border-t
                border-white/[0.06]
                px-1
                py-2.5
                text-center
              "
            >

              <div
                className="
                  text-sm
                  leading-none
                "
              >

                ⚡

              </div>


              <p
                className="
                  mt-1
                  text-[13px]
                  font-black
                  leading-none
                "
              >

                {activeReferrals}

              </p>


              <p
                className="
                  mt-1
                  text-[7px]
                  leading-none
                  text-white/30
                "
              >

                Filleuls actifs

              </p>

            </div>


            {/* AUJOURD'HUI */}

            <div
              className="
                border-t
                border-white/[0.06]
                px-1
                py-2.5
                text-center
              "
            >

              <div
                className="
                  text-sm
                  leading-none
                "
              >

                📈

              </div>


              <p
                className="
                  mt-1
                  text-[13px]
                  font-black
                  leading-none
                  text-orange-400
                "
              >

                {todayEarnings} HTG

              </p>


              <p
                className="
                  mt-1
                  text-[7px]
                  leading-none
                  text-white/30
                "
              >

                Aujourd'hui

              </p>

            </div>

          </section>


          {/* ======================================
              LIEN DE PARRAINAGE
          ====================================== */}

          <section
            className="
              mt-6
            "
          >

            <div
              className="
                space-y-2.5
              "
            >

              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/[0.07]
                  bg-white/[0.025]
                  px-3.5
                  py-2.5
                "
              >

                <p
                  className="
                    text-[9px]
                    leading-tight
                    text-white/40
                  "
                >

                  Mon lien personnel

                </p>

                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-2
                  "
                >

                  <p
                    className="
                      flex-1
                      truncate
                      text-[11px]
                      font-bold
                      text-blue-100
                    "
                  >

                    {referralLink || "Génération..."}

                  </p>

                  <button
                    onClick={copyToClipboard}
                    disabled={!referralLink}
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-blue-400/30
                      bg-blue-500/[0.10]
                      transition-all
                      hover:bg-blue-500/[0.2]
                      disabled:opacity-50
                    "
                  >

                    {copied ? "✅" : "📋"}

                  </button>

                </div>

              </div>

            </div>

          </section>


          {/* ======================================
              QR CODE
          ====================================== */}

          <section
            className="
              mt-6
            "
          >

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-white/[0.07]
                bg-white/[0.025]
                px-3.5
                py-2.5
              "
            >

              <p
                className="
                  text-[9px]
                  leading-tight
                  text-white/40
                "
              >

                QR Code

              </p>

              {qrCodeUrl && (
                <div
                  className="
                    mt-3
                    flex
                    justify-center
                  "
                >

                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="
                      h-32
                      w-32
                      rounded-xl
                      border
                      border-white/[0.1]
                    "
                  />

                </div>
              )}

              <button
                onClick={downloadQRCode}
                disabled={!qrCodeUrl}
                className="
                  mt-3
                  w-full
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-white/[0.07]
                  bg-white/[0.05]
                  px-4
                  py-2.5
                  text-[11px]
                  font-bold
                  text-white/80
                  transition-all
                  hover:bg-white/[0.1]
                  disabled:opacity-50
                "
              >

                📥 Télécharger le QR Code

              </button>

            </div>

          </section>


          {/* ======================================
              PARTAGE
          ====================================== */}

          <section
            className="
              mt-6
            "
          >

            <p
              className="
                text-[9px]
                leading-tight
                text-white/40
              "
            >

              Partager

            </p>

            <div
              className="
                mt-3
                grid
                grid-cols-3
                gap-2
              "
            >

              <button
                onClick={shareWhatsApp}
                disabled={!referralLink}
                className="
                  flex
                  flex-col
                  items-center
                  gap-1.5
                  rounded-xl
                  border
                  border-green-500/20
                  bg-green-500/[0.05]
                  p-2.5
                  transition-all
                  hover:bg-green-500/[0.1]
                  disabled:opacity-50
                "
              >

                <span className="text-lg">💬</span>
                <span className="text-[9px] font-bold text-green-400">WhatsApp</span>

              </button>

              <button
                onClick={shareFacebook}
                disabled={!referralLink}
                className="
                  flex
                  flex-col
                  items-center
                  gap-1.5
                  rounded-xl
                  border
                  border-blue-600/20
                  bg-blue-600/[0.05]
                  p-2.5
                  transition-all
                  hover:bg-blue-600/[0.1]
                  disabled:opacity-50
                "
              >

                <span className="text-lg">📘</span>
                <span className="text-[9px] font-bold text-blue-400">Facebook</span>

              </button>

              <button
                onClick={shareTelegram}
                disabled={!referralLink}
                className="
                  flex
                  flex-col
                  items-center
                  gap-1.5
                  rounded-xl
                  border
                  border-sky-500/20
                  bg-sky-500/[0.05]
                  p-2.5
                  transition-all
                  hover:bg-sky-500/[0.1]
                  disabled:opacity-50
                "
              >

                <span className="text-lg">✈️</span>
                <span className="text-[9px] font-bold text-sky-400">Telegram</span>

              </button>

              <button
                onClick={shareTwitter}
                disabled={!referralLink}
                className="
                  flex
                  flex-col
                  items-center
                  gap-1.5
                  rounded-xl
                  border
                  border-gray-500/20
                  bg-gray-500/[0.05]
                  p-2.5
                  transition-all
                  hover:bg-gray-500/[0.1]
                  disabled:opacity-50
                "
              >

                <span className="text-lg">𝕏</span>
                <span className="text-[9px] font-bold text-gray-400">X</span>

              </button>

              <button
                onClick={shareEmail}
                disabled={!referralLink}
                className="
                  flex
                  flex-col
                  items-center
                  gap-1.5
                  rounded-xl
                  border
                  border-orange-500/20
                  bg-orange-500/[0.05]
                  p-2.5
                  transition-all
                  hover:bg-orange-500/[0.1]
                  disabled:opacity-50
                "
              >

                <span className="text-lg">📧</span>
                <span className="text-[9px] font-bold text-orange-400">Email</span>

              </button>

              <button
                onClick={copyToClipboard}
                disabled={!referralLink}
                className="
                  flex
                  flex-col
                  items-center
                  gap-1.5
                  rounded-xl
                  border
                  border-blue-400/20
                  bg-blue-500/[0.05]
                  p-2.5
                  transition-all
                  hover:bg-blue-500/[0.1]
                  disabled:opacity-50
                "
              >

                <span className="text-lg">📋</span>
                <span className="text-[9px] font-bold text-blue-400">Copier</span>

              </button>

            </div>

          </section>


          {/* ======================================
              COMMENT FONCTIONNE
          ====================================== */}

          <section
            className="
              mt-6
            "
          >

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-white/[0.07]
                bg-white/[0.025]
                px-3.5
                py-2.5
              "
            >

              <p
                className="
                  text-[9px]
                  leading-tight
                  text-white/40
                "
              >

                Comment fonctionne le parrainage ?

              </p>

              <div
                className="
                  mt-3
                  space-y-2.5
                "
              >

                <div
                  className="
                    flex
                    items-start
                    gap-2.5
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-white/[0.1]
                      bg-white/[0.05]
                    "
                  >

                    📤

                  </div>

                  <p
                    className="
                      flex-1
                      text-[11px]
                      text-white/60
                    "
                  >

                    Partagez votre lien avec vos amis

                  </p>

                </div>

                <div
                  className="
                    flex
                    items-start
                    gap-2.5
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-white/[0.1]
                      bg-white/[0.05]
                    "
                  >

                    👤

                  </div>

                  <p
                    className="
                      flex-1
                      text-[11px]
                      text-white/60
                    "
                  >

                    Votre ami crée un compte via votre lien

                  </p>

                </div>

                <div
                  className="
                    flex
                    items-start
                    gap-2.5
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-white/[0.1]
                      bg-white/[0.05]
                    "
                  >

                    🎮

                  </div>

                  <p
                    className="
                      flex-1
                      text-[11px]
                      text-white/60
                    "
                  >

                    Il joue sur WinCash

                  </p>

                </div>

                <div
                  className="
                    flex
                    items-start
                    gap-2.5
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-white/[0.1]
                      bg-white/[0.05]
                    "
                  >

                    ⏰

                  </div>

                  <p
                    className="
                      flex-1
                      text-[11px]
                      text-white/60
                    "
                  >

                    Pendant 6 mois, vous recevez automatiquement 10% de ses pertes

                  </p>

                </div>

                <div
                  className="
                    flex
                    items-start
                    gap-2.5
                  "
                >

                  <div
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-white/[0.1]
                      bg-white/[0.05]
                    "
                  >

                    💰

                  </div>

                  <p
                    className="
                      flex-1
                      text-[11px]
                      text-white/60
                    "
                  >

                    Les commissions sont créditées sur votre solde principal

                  </p>

                </div>

              </div>

            </div>

          </section>


          {/* ======================================
              HISTORIQUE COMMISSIONS
          ====================================== */}

          <section
            className="
              mt-6
            "
          >

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-white/[0.07]
                bg-white/[0.025]
                px-3.5
                py-2.5
              "
            >

              <p
                className="
                  text-[9px]
                  leading-tight
                  text-white/40
                "
              >

                Historique des commissions

              </p>

              {recentRewards.length > 0 ? (
                <div
                  className="
                    mt-3
                    space-y-2
                  "
                >

                  {recentRewards.slice(0, 5).map((reward) => (
                    <div
                      key={reward.id}
                      className="
                        flex
                        items-center
                        justify-between
                        rounded-xl
                        border
                        border-white/[0.05]
                        bg-white/[0.02]
                        px-3
                        py-2.5
                      "
                    >

                      <div
                        className="
                          flex
                          items-center
                          gap-2.5
                        "
                      >

                        <div
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-green-400/20
                            bg-green-500/[0.1]
                          "
                        >

                          💰

                        </div>

                        <div>

                          <p
                            className="
                              text-[11px]
                              font-bold
                              text-green-400
                            "
                          >

                            +{reward.commissionAmount} HTG

                          </p>

                          <p
                            className="
                              text-[10px]
                              text-white/40
                            "
                          >

                            {formatDate(reward.createdAt)}

                          </p>

                        </div>

                      </div>

                    </div>
                  ))}

                </div>
              ) : (
                <div
                  className="
                    mt-4
                    flex
                    flex-col
                    items-center
                    py-6
                    text-center
                  "
                >

                  <div
                    className="
                      mb-3
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/[0.1]
                      bg-white/[0.02]
                    "
                  >

                    📊

                  </div>

                  <p
                    className="
                      text-[11px]
                      text-white/40
                    "
                  >

                    Aucune commission pour le moment

                  </p>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-white/30
                    "
                  >

                    Partagez votre lien pour commencer à gagner

                  </p>

                </div>
              )}

            </div>

          </section>


          {/* ======================================
              MES FILLEULS
          ====================================== */}

          <section
            className="
              mt-6
            "
          >

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-white/[0.07]
                bg-white/[0.025]
                px-3.5
                py-2.5
              "
            >

              <p
                className="
                  text-[9px]
                  leading-tight
                  text-white/40
                "
              >

                Mes filleuls

              </p>

              {referralUsers.length > 0 ? (
                <div
                  className="
                    mt-3
                    space-y-2
                  "
                >

                  {referralUsers.map((userData) => {
                    const isActive = Date.now() <= (userData.referralEndDate || 0);
                    return (
                      <div
                        key={userData.uid}
                        className="
                          flex
                          items-center
                          justify-between
                          rounded-xl
                          border
                          border-white/[0.05]
                          bg-white/[0.02]
                          px-3
                          py-2.5
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            gap-2.5
                          "
                        >

                          <div
                            className="
                              flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-full
                              border
                              border-white/[0.1]
                              bg-gradient-to-br
                              from-blue-500/[0.2]
                              to-purple-500/[0.2]
                            "
                          >

                            👤

                          </div>

                          <div>

                            <p
                              className="
                                text-[11px]
                                font-bold
                                text-white/80
                              "
                            >

                              {userData.username || "Utilisateur"}

                            </p>

                            <p
                              className="
                                text-[10px]
                                text-white/40
                              "
                            >

                              {formatDate(userData.createdAt)}

                            </p>

                          </div>

                        </div>

                        <div
                          className="
                            flex
                            items-center
                            gap-2
                          "
                        >

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/[0.2] text-green-400' : 'bg-orange-500/[0.2] text-orange-400'}`}
                          >

                            {isActive ? 'Actif' : 'Expiré'}

                          </span>

                          <span
                            className="
                              text-[10px]
                              text-white/40
                            "
                          >

                            {getTimeRemaining(userData.referralEndDate)}

                          </span>

                        </div>

                      </div>
                    );
                  })}

                </div>
              ) : (
                <div
                  className="
                    mt-4
                    flex
                    flex-col
                    items-center
                    py-6
                    text-center
                  "
                >

                  <div
                    className="
                      mb-3
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/[0.1]
                      bg-white/[0.02]
                    "
                  >

                    👥

                  </div>

                  <p
                    className="
                      text-[11px]
                      text-white/40
                    "
                  >

                    Aucun filleul pour le moment

                  </p>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-white/30
                    "
                  >

                    Invitez vos amis pour commencer à gagner

                  </p>

                </div>
              )}

            </div>

          </section>


          {/* ======================================
              ACTIONS
          ====================================== */}

          <section
            className="
              mt-6
            "
          >

            <div
              className="
                space-y-2.5
              "
            >

              {/* COPIER LE LIEN */}

              <button
                onClick={copyToClipboard}
                disabled={!referralLink}
                className="
                  flex
                  min-h-[68px]
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-blue-400/30
                  bg-blue-500/[0.10]
                  px-3.5
                  py-2.5
                  text-left
                  shadow-[0_4px_0_rgba(30,64,175,0.65),0_0_18px_rgba(37,99,235,0.08)]
                  backdrop-blur-md
                  transition-all
                  hover:border-blue-300/50
                  hover:bg-blue-500/[0.16]
                  hover:shadow-[0_5px_0_rgba(30,64,175,0.7),0_0_24px_rgba(37,99,235,0.14)]
                  active:translate-y-[3px]
                  active:shadow-none
                  disabled:opacity-50
                "
              >

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-blue-300/25
                    bg-blue-400/[0.10]
                    text-lg
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                  "
                >

                  📋

                </div>


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <h4
                    className="
                      text-[13px]
                      font-black
                      leading-tight
                      text-blue-100
                    "
                  >

                    Copier mon lien

                  </h4>


                  <p
                    className="
                      mt-1
                      truncate
                      text-[9px]
                      leading-tight
                      text-blue-100/40
                    "
                  >

                    Partagez votre lien unique

                  </p>

                </div>

              </button>


              {/* WHATSAPP */}

              <button
                onClick={shareWhatsApp}
                disabled={!referralLink}
                className="
                  flex
                  min-h-[68px]
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-green-400/30
                  bg-green-500/[0.10]
                  px-3.5
                  py-2.5
                  text-left
                  shadow-[0_4px_0_rgba(34,197,94,0.65),0_0_18px_rgba(34,197,94,0.08)]
                  backdrop-blur-md
                  transition-all
                  hover:border-green-300/50
                  hover:bg-green-500/[0.16]
                  hover:shadow-[0_5px_0_rgba(34,197,94,0.7),0_0_24px_rgba(34,197,94,0.14)]
                  active:translate-y-[3px]
                  active:shadow-none
                  disabled:opacity-50
                "
              >

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-green-300/25
                    bg-green-400/[0.10]
                    text-lg
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                  "
                >

                  💬

                </div>


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <h4
                    className="
                      text-[13px]
                      font-black
                      leading-tight
                      text-green-100
                    "
                  >

                    WhatsApp

                  </h4>


                  <p
                    className="
                      mt-1
                      truncate
                      text-[9px]
                      leading-tight
                      text-green-100/40
                    "
                  >

                    Partager sur WhatsApp

                  </p>

                </div>

              </button>


              {/* FACEBOOK */}

              <button
                onClick={shareFacebook}
                disabled={!referralLink}
                className="
                  flex
                  min-h-[68px]
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-blue-400/30
                  bg-blue-500/[0.10]
                  px-3.5
                  py-2.5
                  text-left
                  shadow-[0_4px_0_rgba(30,64,175,0.65),0_0_18px_rgba(37,99,235,0.08)]
                  backdrop-blur-md
                  transition-all
                  hover:border-blue-300/50
                  hover:bg-blue-500/[0.16]
                  hover:shadow-[0_5px_0_rgba(30,64,175,0.7),0_0_24px_rgba(37,99,235,0.14)]
                  active:translate-y-[3px]
                  active:shadow-none
                  disabled:opacity-50
                "
              >

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-blue-300/25
                    bg-blue-400/[0.10]
                    text-lg
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                  "
                >

                  📘

                </div>


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <h4
                    className="
                      text-[13px]
                      font-black
                      leading-tight
                      text-blue-100
                    "
                  >

                    Facebook

                  </h4>


                  <p
                    className="
                      mt-1
                      truncate
                      text-[9px]
                      leading-tight
                      text-blue-100/40
                    "
                  >

                    Partager sur Facebook

                  </p>

                </div>

              </button>

            </div>

          </section>

        </div>

      </div>

    </main>
  );
}

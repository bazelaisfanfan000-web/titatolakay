"use client";

import {
  useState,
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  motion,
} from "framer-motion";

import {
  auth,
} from "@/lib/firebase";

import BackButton from "@/components/BackButton";

export default function RulesPage() {
  const router = useRouter();

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkRulesAccepted = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push("/login");
          return;
        }

        const token = await user.getIdToken();
        const response = await fetch("/api/rules/accept", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.alreadyAccepted) {
            router.push("/dashboard");
          }
        }
      } catch (error) {
        console.error("Erreur vérification règles:", error);
      }
    };

    checkRulesAccepted();
  }, [router]);

  const acceptRules = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch("/api/rules/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[RULES] Erreur réponse:", response.status, text);
        throw new Error(`Erreur ${response.status}: ${text || "Erreur lors de l'acceptation des règles"}`);
      }

      const data = await response.json();
      console.log("[RULES] Réponse succès:", data);

      router.push("/dashboard");
    } catch (error) {
      console.error("Erreur acceptation règles:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      {/* Décoration gauche */}
      <div className="pointer-events-none fixed -left-24 top-24 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

      {/* Décoration droite */}
      <div className="pointer-events-none fixed -right-24 bottom-24 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />

      {/* Conteneur mobile */}
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[430px] px-4 pb-10 pt-8">
        {/* Retour */}
        <BackButton />

        {/* Header */}
        <motion.header
          className="mt-7 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[24px] font-black tracking-tight">
            ⚡ Règles importantes WinCash
          </h1>
          <p className="mt-2 text-[11px] leading-5 text-white/35">
            Bienvenue sur WinCash. Avant de commencer, veuillez lire attentivement les règles concernant les parties, les gains et les retraits.
          </p>
        </motion.header>

        {/* Carte règles */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Règles des parties */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-lg">
                🎮
              </div>
              <h3 className="text-[13px] font-black">Règles des parties</h3>
            </div>
            <ul className="space-y-2 text-[10px] leading-4 text-white/60">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                Chaque joueur doit respecter les règles officielles du jeu.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                La triche, la manipulation des résultats ou l'utilisation de bugs sont strictement interdites. Tout manquement entraînera la suspension définitive du compte.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                Toute partie est définitive. Aucune réclamation ne sera acceptée après validation du résultat.
              </li>
            </ul>
          </div>

          {/* Dépôts & Retraits - FRAIS DE SERVICE APPLICABLES */}
          <div className="rounded-2xl border border-green-500/30 bg-green-500/[0.08] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10 text-lg">
                💰
              </div>
              <h3 className="text-[13px] font-black text-green-300">Dépôts & Retraits - FRAIS DE SERVICE APPLICABLES</h3>
            </div>
            <ul className="space-y-2 text-[10px] leading-4 text-white/70">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-green-400" />
                Dépôt (transfert MonCash) : Vous transférez 100 HTG via MonCash, des frais de transfert de 3% sont déduits. Vous recevez donc 97 HTG sur votre compte WinCash.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-green-400" />
                Retrait (MonCash) : Vous retirez 100 HTG vers votre compte MonCash, des frais de retrait de 5% sont déduits. Vous recevez donc 95 HTG sur votre compte MonCash.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-green-400" />
                Les frais de transfert (2%) et de retrait (5%) sont à la charge du joueur et sont automatiquement prélevés lors de chaque opération.
              </li>
            </ul>
          </div>

          {/* TRANSACTIONS SÉCURISÉES */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10 text-lg">
                🔒
              </div>
              <h3 className="text-[13px] font-black">TRANSACTIONS SÉCURISÉES</h3>
            </div>
            <p className="text-[10px] leading-4 text-white/60">
              Tous les dépôts et retraits sont effectués via MonCash, une plateforme de paiement agréée et sécurisée. Vos fonds sont protégés à chaque étape.
            </p>
          </div>

          {/* Comment gagnez-vous de l'argent ? */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-lg">
                💸
              </div>
              <h3 className="text-[13px] font-black">Comment gagnez-vous de l'argent ?</h3>
            </div>
            <p className="mb-3 text-[10px] leading-4 text-white/60">
              Quand vous gagnez une partie, vous empochez vos gains.
            </p>
            <p className="mb-3 text-[10px] leading-4 text-white/60">
              WinCash prélève une commission de 20% UNIQUEMENT sur votre gain.
            </p>
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="mb-2 text-[9px] font-bold text-white/50">Exemple concret :</p>
              <ul className="space-y-1 text-[9px] text-white/70">
                <li>• Vous misez 100 HTG et vous gagnez la partie. ✅</li>
                <li>• Vous avez gagné 100 HTG de bénéfice.</li>
                <li>• Votre gain net après commission WinCash (20%) = 80 HTG.</li>
                <li>• Vous recevez donc 180 HTG sur votre compte (100 de mise + 80 de gain net).</li>
                <li>• C'est tout ! Rien d'autre n'est déduit ! 😊</li>
              </ul>
            </div>
          </div>

          {/* Âge légal - 18 ANS MINIMUM 🔞 */}
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.08] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-lg">
                👤
              </div>
              <h3 className="text-[13px] font-black text-red-300">Âge légal - 18 ANS MINIMUM 🔞</h3>
            </div>
            <ul className="space-y-2 text-[10px] leading-4 text-white/70">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                Vous devez avoir au moins 18 ans pour créer un compte sur WinCash.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                Toute tentative d'inscription par un mineur entraînera la suspension immédiate du compte et l'annulation des gains éventuels.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                En créant un compte, vous certifiez sur l'honneur avoir 18 ans révolus.
              </li>
            </ul>
          </div>

          {/* Sécurité du compte */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-lg">
                🔐
              </div>
              <h3 className="text-[13px] font-black">Sécurité du compte</h3>
            </div>
            <ul className="space-y-2 text-[10px] leading-4 text-white/60">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-purple-400" />
                Chaque joueur est unique et responsable de son compte.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-purple-400" />
                Tout partage de compte ou activité suspecte (multiples comptes, utilisation d'outils automatisés) entraînera une vérification obligatoire et pourra conduire à une suspension.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-purple-400" />
                Conservez vos identifiants en lieu sûr. WinCash ne pourra pas être tenu responsable en cas de perte ou de vol.
              </li>
            </ul>
          </div>

          {/* Réseau social (VYLO) */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-pink-500/20 bg-pink-500/10 text-lg">
                👥
              </div>
              <h3 className="text-[13px] font-black">Réseau social (VYLO)</h3>
            </div>
            <ul className="space-y-2 text-[10px] leading-4 text-white/60">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-pink-400" />
                L'onglet "Explorer" vous permet de rechercher d'autres joueurs par leur nom d'utilisateur ou leur adresse email.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-pink-400" />
                Pour devenir ami avec un joueur, vous devez lui envoyer une demande d'ami. L'autre joueur doit l'accepter pour que la connexion soit établie.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-pink-400" />
                Tout envoi massif, abusif ou répétitif de demandes d'ami est strictement interdit et pourra entraîner une suspension temporaire ou définitive du compte.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-pink-400" />
                Le harcèlement, l'insulte ou tout comportement malveillant via le chat ou les demandes d'ami entraînera la fermeture immédiate du compte sans remboursement des fonds.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-pink-400" />
                WinCash se réserve le droit de modérer les interactions entre joueurs pour garantir une expérience saine et sécurisée à tous.
              </li>
            </ul>
          </div>

          {/* Responsabilité & litiges */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-lg">
                ⚖️
              </div>
              <h3 className="text-[13px] font-black">Responsabilité & litiges</h3>
            </div>
            <ul className="space-y-2 text-[10px] leading-4 text-white/60">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                Les joueurs doivent vérifier leurs mises avant de rejoindre une partie. Aucun remboursement ne sera effectué en cas d'erreur.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                Les décisions de jeu incombent uniquement au joueur.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                <strong className="text-red-300">WinCash agit uniquement en tant qu'intermédiaire technique. Les gains dépendent du jeu et de l'adversaire. Le site ne garantit aucun gain et ne peut être tenu responsable des pertes financières.</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                En cas de litige entre deux joueurs, la décision du système est finale et sans appel.
              </li>
            </ul>
          </div>

          {/* Règles générales */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-lg">
                📌
              </div>
              <h3 className="text-[13px] font-black">Règles générales</h3>
            </div>
            <ul className="space-y-2 text-[10px] leading-4 text-white/60">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/40" />
                Les dates et heures des parties sont affichées en temps réel.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/40" />
                Toute tentative de fraude ou d'abus sera sanctionnée par la fermeture immédiate du compte, sans remboursement des fonds.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/40" />
                WinCash se réserve le droit de modifier les règles à tout moment, avec notification préalable aux joueurs.
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Checkbox */}
        <motion.div
          className="mt-6 flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <button
            type="button"
            onClick={() => setAccepted(!accepted)}
            className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
              accepted ? "border-green-400 bg-green-400" : "border-white/20 bg-white/[0.02]"
            }`}
          >
            {accepted && <span className="text-xs text-black">✓</span>}
          </button>
          <p className="text-[10px] text-white/40">J'accepte les règles de WinCash</p>
        </motion.div>

        {/* Bouton accepter */}
        <motion.button
          onClick={acceptRules}
          disabled={!accepted || loading}
          className={`mt-4 flex h-12 w-full items-center justify-center rounded-xl border text-center text-xs font-black backdrop-blur-md transition-all active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${
            accepted
              ? "border-green-400/40 bg-green-500/20 text-green-100 shadow-[0_4px_0_rgba(22,101,52,0.8),0_0_18px_rgba(34,197,94,0.12)] hover:border-green-300/60 hover:bg-green-500/30 hover:shadow-[0_5px_0_rgba(22,101,52,0.8),0_0_25px_rgba(34,197,94,0.2)]"
              : "border-white/10 bg-white/[0.03] text-white/40"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          {loading ? "Chargement..." : "✅ J'ai lu, j'ai compris et j'accepte les règles importantes de WinCash."}
        </motion.button>
      </div>
    </main>
  );
}

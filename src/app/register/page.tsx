"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

import {
  ref,
  set,
} from "firebase/database";

import {
  motion,
} from "framer-motion";

import {
  User,
  Mail,
  Lock,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";


function RegisterContent() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const { t } = useLanguage();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [accepted, setAccepted] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);

  // ========================================
  // NOUVEAU : ÉTAT DE CHARGEMENT AUTH
  // ========================================
  const [authLoading, setAuthLoading] = useState(true);

  // ========================================
  // VÉRIFIER SI L'UTILISATEUR EST DÉJÀ CONNECTÉ
  // ========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Si déjà connecté, rediriger vers le dashboard
        router.replace("/dashboard");
      } else {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ========================================
  // RÉCUPÉRER LE PARRAIN (inchangé)
  // ========================================
  useEffect(() => {
    async function fetchReferrer() {
      if (referralCode) {
        console.log("[REGISTER] Récupération parrain pour code:", referralCode);
        try {
          const response = await fetch(`/api/referral/lookup?code=${referralCode}`);
          const data = await response.json();
          console.log("[REGISTER] Réponse lookup:", data);
          if (data.success && data.referrerId) {
            setReferrerId(data.referrerId);
            console.log("[REGISTER] ReferrerId défini:", data.referrerId);
          } else {
            console.log("[REGISTER] Échec lookup:", data.error || "Code introuvable");
          }
        } catch (error) {
          console.error("[REGISTER] Erreur lookup parrain:", error);
        }
      } else {
        console.log("[REGISTER] Pas de code de parrainage");
      }
    }
    fetchReferrer();
  }, [referralCode]);



  async function register() {

    console.log("[REGISTER] Début de l'inscription", { username, email, password: password.length, accepted });

    if (
      !username.trim() ||
      !email.trim() ||
      !password
    ) {

      console.log("[REGISTER] Champs manquants");
      return setError(
        "Tous les champs sont obligatoires"
      );

    }



    if (password.length < 6) {

      console.log("[REGISTER] Mot de passe trop court");
      return setError(
        "Le mot de passe doit avoir au moins 6 caractères"
      );

    }



    if (!accepted) {

      console.log("[REGISTER] Conditions non acceptées");
      return setError(
        "Tu dois accepter les conditions d'utilisation"
      );

    }

    console.log("[REGISTER] Validations passées");






    try {
      console.log("[REGISTER] Début du try block");
      setLoading(true);
      setError("");
      console.log("[REGISTER] Loading state set to true");



      /*
      ========================================
      CRÉATION COMPTE FIREBASE AUTH
      ========================================
      */

      console.log("[REGISTER] Appel createUserWithEmailAndPassword");
      console.log("[REGISTER] Auth instance:", auth);
      console.log("[REGISTER] Auth app name:", auth.app.name);
      const { user } =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      console.log("[REGISTER] Utilisateur créé avec succès", { uid: user.uid, email: user.email });



      const now = Date.now();



      /*
      ========================================
      CRÉATION PROFIL UTILISATEUR
      ========================================
      */


      // Générer un code de parrainage unique (8 caractères pour réduire les collisions)
      const generateReferralCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      const generatedReferralCode = generateReferralCode();

      console.log("[REGISTER] Données utilisateur à créer:", {
        uid: user.uid,
        username: username.trim(),
        email: user.email || email.trim(),
        referralCode: generatedReferralCode,
        referrerId: referrerId,
        hasReferrer: !!referrerId
      });

      await set(
        ref(
          database,
          `users/${user.uid}`
        ),
        {

          uid: user.uid,


          username:
            username.trim(),


          email:
            user.email ||
            email.trim(),


          // Nouveau compte sans bonus
          balance: 0,


          currency:
            "HTG",


          createdAt:
            now,


          acceptedTerms:
            true,


          acceptedTermsAt:
            now,


          balanceUpdatedAt:
            now,

          // Parrainage
          referralCode: generatedReferralCode,
          referralCreatedAt: now,
          ...(referrerId && {
            referredBy: referrerId,
            referralStartDate: now,
            referralEndDate: now + (6 * 30 * 24 * 60 * 60 * 1000) // 6 mois
          })

        }
      );

      console.log("[REGISTER] Utilisateur créé avec referredBy:", referrerId);

      // ========================================
      // NOUVEAU : DÉFINIR LE COOKIE POUR LE MIDDLEWARE
      // ========================================
      const token = await user.getIdToken();
      const cookieRes = await fetch("/api/auth/set-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!cookieRes.ok) {
        console.error("[REGISTER] Erreur lors de la définition du cookie");
        // On continue quand même, mais log
      }

      /*
      ========================================
      DEMANDE PERMISSION NOTIFICATIONS (non bloquante)
      ========================================
      */

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(error => {
          console.error("[REGISTER] Erreur demande notifications:", error);
        });
      }

      /*
      ========================================
      REDIRECTION RÈGLES IMPORTANTES
      ========================================
      */

      console.log("[REGISTER] Redirection vers /rules");
      router.push("/rules");


    } catch (err: any) {


      console.error(
        "ERREUR INSCRIPTION:",
        err
      );



      const errorCode =
        err?.code || "";



      if (
        errorCode ===
        "auth/email-already-in-use"
      ) {


        setError(
          "Cet email existe déjà"
        );


      } else if (
        errorCode ===
        "auth/invalid-email"
      ) {


        setError(
          "Email invalide"
        );


      } else if (
        errorCode ===
        "auth/weak-password"
      ) {


        setError(
          "Le mot de passe est trop faible"
        );


      } else {


        setError(
          err?.message ||
          "Une erreur est survenue pendant la création du compte"
        );


      }



    } finally {


      setLoading(false);


    }


  }


  // ========================================
  // AFFICHAGE DE CHARGEMENT PENDANT LA VÉRIFICATION
  // ========================================
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070b] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-sm text-white/50">Vérification...</p>
        </div>
      </div>
    );
  }


  return (

    <main
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        bg-[#05070b]
        px-3
        text-white
      "
    >

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-180px]
          h-[350px]
          w-[350px]
          -translate-x-1/2
          rounded-full
          bg-blue-600/10
          blur-[120px]
        "
      />


      <motion.section

        initial={{
          opacity: 0,
          y: 15,
        }}

        animate={{
          opacity: 1,
          y: 0,
        }}

        className="
          relative
          z-10
          w-full
          max-w-[300px]
        "

      >


        <div
          className="
            rounded-2xl
            border
            border-white/[0.08]
            bg-[#0a0d13]/95
            p-3
            shadow-[0_20px_60px_rgba(0,0,0,0.45)]
            backdrop-blur-2xl
          "
        >


          <p
            className="
              text-center
              text-[8px]
              font-black
              uppercase
              tracking-[0.18em]
              text-blue-400
            "
          >
            Nouveau joueur
          </p>



          <h1
            className="
              mt-1
              text-center
              text-lg
              font-black
            "
          >
            Crée ton compte 👋
          </h1>



          <p
            className="
              mt-1
              text-center
              text-[9px]
              leading-4
              text-white/30
            "
          >
            Rejoins Wincash et commence à jouer avec tes amis.
          </p>




          <Input
            icon={
              <User size={13} />
            }
            placeholder={t.username}
            value={username}
            onChange={setUsername}
          />



          <Input
            icon={
              <Mail size={13} />
            }
            placeholder={t.email}
            type="email"
            value={email}
            onChange={setEmail}
          />



          <Input
            icon={
              <Lock size={13} />
            }
            placeholder={t.password}
            type="password"
            value={password}
            onChange={setPassword}
          />







          {error && (

            <p
              className="
                mt-2
                rounded-lg
                border
                border-red-500/10
                bg-red-500/[0.06]
                px-2
                py-1.5
                text-[8px]
                text-red-400
              "
            >
              {error}
            </p>

          )}





          <label
            className="
              mt-2
              flex
              cursor-pointer
              items-start
              gap-2
              text-[7px]
              leading-3
              text-white/35
            "
          >


            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) =>
                setAccepted(
                  e.target.checked
                )
              }

              className="
                mt-0.5
                h-3
                w-3
                accent-blue-600
              "
            />


            <span>

              J'accepte les{" "}

              <Link
                href="/conditions-utilisation"
                className="
                  font-bold
                  text-blue-400
                "
              >
                conditions d'utilisation
              </Link>


              {", la "}


              <Link
                href="/politique-confidentialite"
                className="
                  font-bold
                  text-blue-400
                "
              >
                politique de confidentialité
              </Link>

              {" et les "}

              <Link
                href="/rules"
                className="
                  font-bold
                  text-blue-400
                "
              >
                règles importantes
              </Link>

              {" de WinCash."}

            </span>


          </label>





          <button

            type="button"

            onClick={register}

            disabled={loading}


            className="
              mt-3
              flex
              h-9
              w-full
              items-center
              justify-center
              rounded-lg
              border
              border-blue-400/40
              bg-blue-500/20
              text-[9px]
              font-black
              text-blue-100
              shadow-[0_3px_0_rgba(30,64,175,0.8),0_0_18px_rgba(37,99,235,0.12)]
              backdrop-blur-md
              transition-all
              hover:border-blue-300/60
              hover:bg-blue-500/30
              active:translate-y-[3px]
              active:shadow-none
              disabled:opacity-50
            "
          >

            {
              loading
                ? `${t.loading}...`
                : `🚀 ${t.createAccount}`
            }


          </button>

          {/* 🔒 AJOUT : BADGE SÉCURITÉ MonCash */}
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-green-500/10 bg-green-500/[0.04] px-3 py-1.5">
            <span className="text-[10px]">🟢</span>
            <span className="text-[7px] font-medium text-green-400/70">
              💸 Déposez et retirez facilement avec MonCash.
            </span>
          </div>






          <div
            className="
              mt-3
              text-center
            "
          >

            <p
              className="
                text-[8px]
                text-white/25
              "
            >
              Déjà enregistré ?
            </p>



            <Link

              href="/login"

              className="
                mt-2
                flex
                h-9
                w-full
                items-center
                justify-center
                rounded-lg
                border
                border-blue-400/25
                bg-blue-500/[0.08]
                text-[9px]
                font-black
                text-blue-100
                shadow-[0_3px_0_rgba(30,64,175,0.65)]
                backdrop-blur-md
                transition-all
                hover:bg-blue-500/[0.15]
                active:translate-y-[3px]
              "

            >

              🔐 Se connecter


            </Link>


          </div>



        </div>




        <p
          className="
            mt-3
            text-center
            text-[7px]
            text-white/15
          "
        >
         🔒 100 % sécurisé — Vos gains sont en sécurité. ✅
        </p>



      </motion.section>


    </main>

  );


}

export default function Register() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-3 text-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-[10px] text-white/30">Chargement...</p>
        </div>
      </main>
    }>
      <RegisterContent />
    </Suspense>
  );
}





/*
========================================
INPUT
========================================
*/


function Input({

  icon,

  placeholder,

  type = "text",

  value,

  onChange,

}: {

  icon: React.ReactNode;

  placeholder: string;

  type?: string;

  value: string;

  onChange: (value: string) => void;

}) {


  return (

    <div
      className="
        relative
        mt-2
      "
    >


      <div
        className="
          pointer-events-none
          absolute
          left-2.5
          top-1/2
          -translate-y-1/2
          text-blue-400
        "
      >

        {icon}

      </div>




      <input

        type={type}

        value={value}

        placeholder={placeholder}


        onChange={(e) =>

          onChange(
            e.target.value
          )

        }


        className="
          h-8
          w-full
          rounded-lg
          border
          border-white/[0.08]
          bg-white/[0.025]
          pl-8
          pr-2
          text-[9px]
          text-white
          outline-none
          transition
          placeholder:text-white/20
          focus:border-blue-500/40
          focus:bg-blue-500/[0.04]
        "

      />


    </div>

  );


}
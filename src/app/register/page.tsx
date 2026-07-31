"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  auth,
  database,
} from "@/lib/firebase";

import {
  createUserWithEmailAndPassword,
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
  Bell,
} from "lucide-react";


export default function Register() {

  const router = useRouter();


  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [accepted, setAccepted] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<"granted" | "denied" | "default" | "prompt">("default");

  // Demander la permission de notification au chargement
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Demander la permission de notification
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === "granted";
    }
    return false;
  };



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



    // Demander la permission de notification avant l'inscription
    if (notificationPermission === "default") {
      const granted = await requestNotificationPermission();
      if (!granted) {
        // Continuer même si refusé, mais avertir
        console.log("Permission de notification refusée");
      }
    }



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

        }
      );



      /*
      ========================================
      ENREGISTRER TOKEN FCM SI PERMISSION ACCORDÉE
      ========================================
      */
      if (notificationPermission === "granted") {
        try {
          // Enregistrer le service worker et obtenir le token
          if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            console.log("Service Worker enregistré:", registration);
          }
        } catch (swError) {
          console.error("Erreur enregistrement SW:", swError);
        }
      }



      /*
      ========================================
      REDIRECTION RÈGLES IMPORTANTES
      ========================================
      */


      router.push(
        "/rules"
      );



    } catch (err:any) {


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
          opacity:0,
          y:15,
        }}

        animate={{
          opacity:1,
          y:0,
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
            mb-3
            flex
            items-center
            justify-between
            rounded-xl
            border
            border-white/[0.07]
            bg-white/[0.025]
            px-3
            py-2
            backdrop-blur-xl
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                border
                border-blue-400/10
                bg-blue-500/[0.06]
              "
            >

              <span
                className="
                  text-[10px]
                  font-black
                  text-blue-400
                "
              >
                XO
              </span>


            </div>



            <div>

              <p
                className="
                  text-[11px]
                  font-black
                  tracking-[0.15em]
                "
              >
                TI TA TO
              </p>


              <p
                className="
                  text-[7px]
                  text-white/30
                "
              >
                Jeu • Stratégie • Victoire
              </p>

            </div>


          </div>


          <span
            className="
              rounded-full
              border
              border-blue-400/10
              bg-blue-500/[0.07]
              px-2
              py-1
              text-[7px]
              font-bold
              text-blue-300
            "
          >
            ● BETA
          </span>


        </div>        <div
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
            Rejoins TiTaTo et commence à jouer avec tes amis.
          </p>




          <Input
            icon={
              <User size={13}/>
            }
            placeholder="Nom joueur"
            value={username}
            onChange={setUsername}
          />



          <Input
            icon={
              <Mail size={13}/>
            }
            placeholder="Email"
            type="email"
            value={email}
            onChange={setEmail}
          />



          <Input
            icon={
              <Lock size={13}/>
            }
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
          />



          {/* Notification Permission */}
          {notificationPermission === "default" && (
            <motion.button
              type="button"
              onClick={requestNotificationPermission}
              whileTap={{ scale: 0.97 }}
              className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-green-400/30 bg-green-500/10 text-[8px] font-bold text-green-300 transition-all hover:bg-green-500/20"
            >
              <Bell size={11} />
              Activer les notifications
            </motion.button>
          )}

          {notificationPermission === "granted" && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-400/20 bg-green-500/5 px-2 py-1.5">
              <Bell size={11} className="text-green-400" />
              <p className="text-[8px] text-green-300">Notifications activées ✓</p>
            </div>
          )}

          {notificationPermission === "denied" && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-orange-400/20 bg-orange-500/5 px-2 py-1.5">
              <Bell size={11} className="text-orange-400" />
              <p className="text-[8px] text-orange-300">Notifications bloquées</p>
            </div>
          )}




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
              onChange={(e)=>
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


              {" "}et la{" "}


              <Link
                href="/politique-confidentialite"
                className="
                  font-bold
                  text-blue-400
                "
              >
                politique de confidentialité
              </Link>


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
              ? "Création..."
              : "🚀 Créer mon compte"
            }


          </button>






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
          TiTaTo • Version Beta
        </p>



      </motion.section>


    </main>

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

  type="text",

  value,

  onChange,

}:{

  icon:React.ReactNode;

  placeholder:string;

  type?:string;

  value:string;

  onChange:(value:string)=>void;

}){


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


        onChange={(e)=>

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
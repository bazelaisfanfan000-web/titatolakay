"use client";

import {
  useParams,
  useRouter
} from "next/navigation";

import {
  useState
} from "react";

export default function AdminCodePage(){

  const router = useRouter();

  const params = useParams();

  const adminCode = params.adminCode as string;

  // URL secrète
  const SECRET_URL = "123456789";

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  function enter(){

    if(password === "30Decembre2009"){

      localStorage.setItem(
        "adminAccess",
        "true"
      );

      router.push("/admin");

    }else{

      setError(
        "❌ Mot de passe incorrect"
      );

    }

  }

  // Vérifie l'URL secrète
  if(adminCode !== SECRET_URL){

    return(

      <div
        className="
        min-h-screen
        bg-black
        text-white
        flex
        items-center
        justify-center
        "
      >

        ❌ Page introuvable

      </div>

    );

  }

  return(

    <div
      className="
      min-h-screen
      bg-black
      text-white
      flex
      items-center
      justify-center
      p-5
      "
    >

      <div
        className="
        bg-white/5
        border
        border-white/10
        rounded-3xl
        p-8
        w-full
        max-w-md
        "
      >

        <h1
          className="
          text-3xl
          font-black
          text-center
          "
        >
          👑 Administration Domino Lakay
        </h1>

        <p
          className="
          text-gray-400
          text-center
          mt-4
          "
        >
          Deuxième vérification administrateur
        </p>

        <input
          type="password"
          value={password}
          onChange={(e)=>
            setPassword(e.target.value)
          }
          placeholder="Mot de passe admin"
          className="
          mt-6
          w-full
          bg-black
          border
          border-white/20
          rounded-xl
          p-4
          "
        />

        <button
          onClick={enter}
          className="
          mt-5
          w-full
          bg-blue-600
          py-3
          rounded-xl
          font-bold
          "
        >
          🔓 Entrer
        </button>

        {
          error &&

          <p
            className="
            text-red-500
            text-center
            mt-4
            "
          >
            {error}
          </p>
        }

      </div>

    </div>

  );

}
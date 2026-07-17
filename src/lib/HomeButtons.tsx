"use client";

import { useRouter } from "next/navigation";


export default function HomeButtons(){

  const router = useRouter();


  return (

    <div className="
      flex
      flex-col
      gap-4
      w-full
      max-w-sm
      mx-auto
    ">

      <button

        onClick={() =>
          router.push("/dashboard")
        }

        className="
          w-full
          p-4
          rounded-2xl
          bg-cyan-500
          text-black
          font-bold
          text-lg
          hover:scale-105
          transition
        "

      >

        🚀 Tableau de bord

      </button>

    </div>

  );
}

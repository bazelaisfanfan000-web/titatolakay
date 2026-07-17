"use client";

import {
  useState
} from "react";

import {
  auth
} from "@/lib/firebase";

import {
  MONETAG_CONFIG
} from "@/lib/monetag";



export default function RewardAdButton(){


  const [loading,setLoading] =
  useState(false);



  async function watchAd(){


    try{


      setLoading(true);



      const user =
      auth.currentUser;



      if(!user){

        alert(
          "Connecte-toi pour regarder une publicité"
        );

        return;

      }




      // ==========================
      // OUVERTURE PUBLICITE MONETAG
      // ==========================


      window.open(

        `https://${MONETAG_CONFIG.domain}`,

        "_blank"

      );




      // Temps minimum d'attente pub

      await new Promise(
        resolve =>
        setTimeout(resolve,15000)
      );





      // ==========================
      // VALIDATION RECOMPENSE
      // ==========================


      const token =
      await user.getIdToken();




      const response =
      await fetch(
        "/api/reward/ad",
        {

          method:"POST",

          headers:{

            "Content-Type":
            "application/json"

          },


          body:JSON.stringify({

            token

          })

        }
      );





      const data =
      await response.json();





      if(data.success){


        alert(
          "🎉 +50 HTG ajouté à ton solde"
        );


      }
      else{


        alert(

          data.error ||
          "Impossible de recevoir la récompense"

        );


      }





    }
    catch(error){


      console.error(
        "REWARD AD ERROR",
        error
      );


      alert(
        "Erreur pendant la publicité"
      );


    }
    finally{


      setLoading(false);


    }


  }




  return (


    <button


      onClick={watchAd}


      disabled={loading}


      className="
      w-full
      max-w-sm
      mx-auto
      bg-blue-600
      hover:bg-blue-700
      text-white
      font-bold
      py-3
      px-6
      rounded-2xl
      shadow-lg
      transition
      disabled:opacity-50
      "


    >


      {

        loading

        ?

        "⏳ Publicité en cours..."

        :

        "🎬 Regarder une pub +50 HTG"

      }


    </button>


  );


}
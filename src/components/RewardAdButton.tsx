"use client";

import {
  useState
} from "react";

import {
  auth
} from "@/lib/firebase";

import {
  sendNotification
} from "@/lib/notifications";


const DIRECT_LINK =
"https://omg10.com/4/11336319";


export default function RewardAdButton(){

  const [loading,setLoading] = useState(false);

  const [seconds,setSeconds] = useState(0);

  const [message,setMessage] = useState("");



  async function watchAd(){

    const user = auth.currentUser;


    if(!user){

      setMessage(
        "❌ Utilisateur non connecté"
      );

      setTimeout(()=>{
        setMessage("");
      },3000);

      return;

    }



    try{


      setLoading(true);



      window.open(
        DIRECT_LINK,
        "_blank"
      );



      let time = 15;


      setSeconds(time);




      const timer = setInterval(async()=>{


        time--;


        setSeconds(time);



        if(time <= 0){


          clearInterval(timer);


          await claimReward(user);


        }


      },1000);



    }


    catch(error:any){


      console.error(
        "[AD BUTTON] START ERROR:",
        error
      );


      setMessage(
        "❌ Erreur ouverture pub"
      );


      setTimeout(()=>{

        setMessage("");

      },3000);



      setLoading(false);


    }


  }






  async function claimReward(user:any){


    try{


      const token =
      await user.getIdToken(true);




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

            token,

            uid:user.uid

          })

        }

      );





      const responseText =
      await response.text();




      const contentType =
      response.headers.get(
        "content-type"
      );





      if(
        !contentType ||
        !contentType.includes(
          "application/json"
        )
      ){

        throw new Error(
          "Réponse serveur invalide"
        );

      }





      const data =
      JSON.parse(
        responseText
      );





      if(!response.ok){


        throw new Error(

          data.error ||

          "Erreur API"

        );


      }





      if(data.success){


        setMessage(
          "🎉 +5 HTG ajouté à ton portefeuille"
        );



        setTimeout(()=>{


          setMessage("");


        },3000);


        await sendNotification(
          user.uid,
          {
            title:"🎬 Récompense publicité",
            message:"Tu as regardé une publicité et reçu 5 HTG",
            type:"ad_reward",
            amount:5
          }
        );



      }


      else{


        throw new Error(

          data.error ||

          "Récompense refusée"

        );


      }



    }


    catch(error:any){


      console.error(
        "[AD BUTTON] CLAIM ERROR:",
        error
      );



      setMessage(

        "❌ Erreur récompense: " +

        error.message

      );



      setTimeout(()=>{

        setMessage("");

      },3000);



    }



    finally{


      setLoading(false);

      setSeconds(0);


    }


  }






  return(

    <>


    <button

      onClick={watchAd}

      disabled={loading}

      className="
        px-3
        py-2
        text-[11px]
        rounded-xl
        bg-blue-600
        hover:bg-blue-500
        text-white
        font-black
        shadow-lg
        transition
        disabled:opacity-50
      "

    >

      {

        loading

        ?

        `⏳ Pub ${seconds}s`

        :

        "🎬 Pub +5 HTG"

      }


    </button>





    {

      message &&


      <div

      className="
      fixed
      bottom-6
      left-1/2
      -translate-x-1/2
      bg-green-600
      text-white
      px-6
      py-3
      rounded-2xl
      font-black
      shadow-xl
      z-50
      animate-bounce
      "

      >

      {message}


      </div>


    }


    </>

  );


}
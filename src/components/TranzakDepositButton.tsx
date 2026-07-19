"use client";

import {
  useState
} from "react";


import {
  auth
} from "@/lib/firebase";



export default function TranzakDepositButton(){


  const [amount,setAmount] =
  useState(500);


  const [phone,setPhone] =
  useState("");



  const [loading,setLoading] =
  useState(false);




  async function deposit(){


    try{


      setLoading(true);



      const user =
      auth.currentUser;



      if(!user){

        alert(
          "Connecte-toi d'abord"
        );

        return;

      }





      const response =
      await fetch(
        "/api/wallet/deposit/create",
        {

          method:"POST",

          headers:{
            "Content-Type":
            "application/json"
          },


          body:JSON.stringify({

            uid:user.uid,

            amount:Number(amount),

            phone,

            name:
            user.displayName || "TiTaTo User",

            email:
            user.email || ""

          })

        }
      );






      const data =
      await response.json();






      if(!response.ok){

        alert(
          data.error ||
          "Erreur création paiement"
        );

        return;

      }






      if(data.payment_url){


        window.location.href =
        data.payment_url;


      }



    }
    catch(error){


      console.error(
        error
      );


      alert(
        "Erreur serveur"
      );


    }
    finally{


      setLoading(false);


    }


  }







  return (

    <div
      className="
      bg-zinc-900
      border
      border-zinc-800
      rounded-3xl
      p-5
      space-y-4
      "
    >


      <h3
        className="
        text-xl
        font-bold
        "
      >
        💳 Déposer avec Tranzak
      </h3>




      <input

        type="number"

        value={amount}

        onChange={
          e=>
          setAmount(
            Number(e.target.value)
          )
        }


        className="
        w-full
        bg-black
        rounded-xl
        p-3
        "
        
        placeholder="Montant HTG"

      />





      <input

        type="tel"

        value={phone}

        onChange={
          e=>
          setPhone(
            e.target.value
          )
        }


        className="
        w-full
        bg-black
        rounded-xl
        p-3
        "

        placeholder="+509xxxxxxxx"

      />







      <button

        onClick={deposit}

        disabled={loading}


        className="
        w-full
        bg-blue-600
        hover:bg-blue-700
        rounded-xl
        py-3
        font-bold
        "

      >

        {
          loading
          ?
          "Création..."
          :
          "💰 Déposer"
        }


      </button>



    </div>

  );


}
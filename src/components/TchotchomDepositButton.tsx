"use client";

import {
  useState
} from "react";

import {
  auth
} from "@/lib/firebase";



export default function TchotchomDepositButton(){

  const [amount,setAmount] =
    useState("");

  const [loading,setLoading] =
    useState(false);

  const [message,setMessage] =
    useState("");



  async function deposit(){


    const user =
      auth.currentUser;



    if(!user){

      setMessage(
        "Connecte-toi d'abord"
      );

      return;

    }




    const value =
      Number(amount);



    if(!value || value < 10){

      setMessage(
        "Minimum 10 HTG"
      );

      return;

    }





    try{


      setLoading(true);

      setMessage("");




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

              uid:
              user.uid,

              amount:value

            })

          }

        );





      const data =
        await response.json();





      if(!response.ok){

        throw new Error(
          data.error ||
          "Erreur dépôt"
        );

      }




      console.log(
        "Paiement Tchotchom",
        data
      );





      /*
        Selon la réponse Tchotchom,
        on redirigera ici vers
        la page de paiement.
      */


      if(
        data.payment?.url
      ){

        window.location.href =
          data.payment.url;

      }
      else{


        setMessage(
          "Paiement créé, vérifie la réponse Tchotchom"
        );


      }





    }
    catch(error:any){


      setMessage(
        error.message
      );


    }
    finally{


      setLoading(false);


    }


  }




  return (

    <div className="space-y-3">


      <input

        type="number"

        value={amount}

        onChange={
          (e)=>
          setAmount(
            e.target.value
          )
        }

        placeholder="Montant HTG"

        className="
          w-full
          rounded-xl
          bg-white/10
          border
          border-white/20
          px-4
          py-3
          text-white
        "

      />



      <button

        onClick={deposit}

        disabled={loading}

        className="
          w-full
          rounded-xl
          bg-blue-600
          py-3
          font-bold
          text-white
          hover:bg-blue-700
          disabled:opacity-50
        "

      >

        {
          loading
          ?
          "Création..."
          :
          "Déposer avec Tchotchom"
        }

      </button>



      {
        message &&
        <p className="
          text-sm
          text-center
          text-gray-300
        ">

          {message}

        </p>
      }


    </div>

  );


}
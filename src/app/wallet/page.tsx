"use client";

import {
  useEffect,
  useState
} from "react";

import {
  auth,
  db
} from "@/lib/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  ref,
  onValue
} from "firebase/database";

import TranzakDepositButton 
from "@/components/TranzakDepositButton";

import TranzakWithdrawButton 
from "@/components/TranzakWithdrawButton";



export default function WalletPage(){


  const [balance,setBalance] =
  useState(0);



  const [uid,setUid] =
  useState("");



  useEffect(()=>{


    const unsubscribe =
    onAuthStateChanged(
      auth,
      (user)=>{


        if(!user){
          return;
        }



        setUid(
          user.uid
        );



        const balanceRef =
        ref(
          db,
          `users/${user.uid}/balance`
        );



        const stopBalance =
        onValue(
          balanceRef,
          (snapshot)=>{


            const value =
            snapshot.val();


            setBalance(
              Number(value || 0)
            );


          }
        );



        return ()=>stopBalance();


      }
    );



    return ()=>unsubscribe();



  },[]);






  return (

    <main
      className="
      min-h-screen
      bg-black
      text-white
      p-6
      "
    >


      <div
        className="
        max-w-md
        mx-auto
        "
      >


        <h1
          className="
          text-3xl
          font-bold
          mb-6
          "
        >
          💰 Mon Wallet
        </h1>




        <section
          className="
          bg-zinc-900
          rounded-3xl
          p-6
          border
          border-zinc-800
          "
        >

          <p
            className="
            text-gray-400
            "
          >
            Solde disponible
          </p>



          <h2
            className="
            text-4xl
            font-bold
            mt-2
            "
          >

            {balance.toLocaleString()}
            {" "}
            HTG

          </h2>


        </section>







        <section
          className="
          mt-6
          space-y-4
          "
        >


          <h3
            className="
            text-xl
            font-bold
            "
          >
            💳 Dépôt
          </h3>


          <TranzakDepositButton />





          <h3
            className="
            text-xl
            font-bold
            mt-8
            "
          >
            💸 Retrait
          </h3>



          <TranzakWithdrawButton />


        </section>




      </div>


    </main>

  );


}
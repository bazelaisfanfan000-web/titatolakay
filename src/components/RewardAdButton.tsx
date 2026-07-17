"use client";

import {
  useState
} from "react";

import {
  auth
} from "@/lib/firebase";


const DIRECT_LINK =
"https://omg10.com/4/11336319";


export default function RewardAdButton(){

  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);


  async function watchAd(){

    const user = auth.currentUser;

    if(!user){
      alert("Utilisateur non connecté");
      return;
    }

    try{
      setLoading(true);
      
      window.open(DIRECT_LINK, "_blank");

      let time = 15;
      setSeconds(time);

      const timer = setInterval(async()=>{
        time--;
        setSeconds(time);

        if(time <= 0){
          clearInterval(timer);
          await claimReward(user);
        }
      }, 1000);

    }
    catch(error: any){
      console.error("[AD BUTTON] START ERROR:", error);
      alert(error.message || "Erreur ouverture pub");
      setLoading(false);
    }

  }


  async function claimReward(user: any){

    try{
      const token = await user.getIdToken(true);

      console.log("[AD BUTTON] Fetching /api/reward/ad...");
      
      const response = await fetch("/api/reward/ad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token
        })
      });

      console.log("[AD BUTTON] Response status:", response.status);
      console.log("[AD BUTTON] Response headers:", Object.fromEntries(response.headers.entries()));

      // Read response as text first to debug
      const responseText = await response.text();
      console.log("[AD BUTTON] Response text:", responseText);

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      console.log("[AD BUTTON] Content-Type:", contentType);

      if(!contentType || !contentType.includes("application/json")){
        console.error("[AD BUTTON] Non-JSON response received");
        throw new Error(`Serveur erreur: réponse non-JSON (${response.status}) - ${responseText.substring(0, 200)}`);
      }

      // Parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[AD BUTTON] JSON parse error:", parseError);
        throw new Error("Erreur parsing JSON serveur");
      }

      console.log("[AD BUTTON] API RESPONSE:", data);

      if(!response.ok){
        throw new Error(data.error || "API erreur");
      }

      if(data.success){
        alert("🎉 +5 HTG ajouté");
        window.location.reload();
      }
      else{
        throw new Error(data.error || "Récompense refusée");
      }

    }
    catch(error: any){
      console.error("[AD BUTTON] CLAIM ERROR:", error);
      alert("Erreur récompense: " + error.message);
    }
    finally{
      setLoading(false);
      setSeconds(0);
    }

  }


  return(
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
        ? `⏳ Pub ${seconds}s`
        : "🎬 Pub +5 HTG"
      }
    </button>
  );

}

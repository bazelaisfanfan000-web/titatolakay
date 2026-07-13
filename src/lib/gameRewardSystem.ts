import {
  adminDB
} from "@/lib/firebaseAdmin";


// ==================================
// SYSTÈME DE RÉCOMPENSE SÉCURISÉ
// ==================================

export async function processGameReward(gameId:string){

  console.log("🎮 PROCESS GAME REWARD START", {
    gameId
  });

  try{

    // 1. Récupérer la partie
    const gameRef = adminDB.ref(`rooms/${gameId}`);

    const gameSnap = await gameRef.get();

    if(!gameSnap.exists()){

      console.error("❌ Partie introuvable", {
        gameId
      });

      throw new Error("Partie introuvable");
    }

    const game = gameSnap.val();

    console.log("📋 Partie trouvée", {
      status: game.status,
      winnerId: game.game?.winner,
      pot: game.pot,
      rewardPaid: game.game?.paymentDone
    });


    // 2. Vérifier que la partie est terminée
    if(game.game?.status !== "finished"){

      console.error("❌ Partie non terminée", {
        status: game.game?.status
      });

      throw new Error("Partie non terminée");
    }


    // 3. Vérifier le gagnant
    const winnerId = game.game?.winner;

    if(!winnerId){

      console.error("❌ Aucun gagnant trouvé");

      throw new Error("Aucun gagnant trouvé");
    }


    // 4. Vérifier si déjà payé
    if(game.game?.paymentDone === true){

      console.warn("⚠️ Récompense déjà envoyée", {
        gameId
      });

      return {
        success:false,
        message:"Récompense déjà envoyée",
        alreadyPaid:true
      };
    }


    // 5. Calcul récompense
    const pot = Number(game.pot || 0);

    if(pot <= 0){

      console.error("❌ Pot invalide", {
        pot
      });

      throw new Error("Pot invalide");
    }

    const commission = Math.floor(pot * 0.10);

    const reward = pot - commission;

    console.log("💰 Calcul récompense", {
      pot,
      commission,
      reward
    });


    // 6. Transaction Firebase sécurisée avec syntaxe correcte
    await adminDB.ref(`users/${winnerId}/balance`).transaction((currentBalance:any)=>{
      if(currentBalance === null){
        console.error("❌ Solde gagnant introuvable");
        return;
      }

      const oldBalance = Number(currentBalance || 0);
      const newBalance = oldBalance + reward;

      console.log("💳 Mise à jour solde", {
        winnerId,
        oldBalance,
        newBalance,
        reward
      });

      return newBalance;
    });


    // 7. Enregistrer la transaction du gagnant
    await adminDB
    .ref(`transactions/${winnerId}`)
    .push({
      type:"game_win",
      amount:reward,
      gameId,
      commission,
      pot,
      createdAt:Date.now()
    });


    // 8. Enregistrer la commission plateforme
    await adminDB
    .ref("platform/earnings")
    .push({
      type:"commission",
      amount:commission,
      gameId,
      createdAt:Date.now()
    });


    // 9. Marquer le paiement comme effectué
    await gameRef.update({
      "game/paymentDone":true,
      "game/commission":commission,
      "game/winnerReward":reward,
      "game/paidAt":Date.now()
    });


    console.log("🎉 PROCESS GAME REWARD SUCCESS", {
      gameId,
      winnerId,
      reward,
      commission
    });


    return{
      success:true,
      winnerId,
      pot,
      commission,
      reward,
      message:"Récompense envoyée avec succès"
    };

  }

  catch(error:any){

    console.error(
      "❌ PROCESS GAME REWARD ERROR",
      {
        gameId,
        error:error.message
      }
    );

    throw error;
  }

}
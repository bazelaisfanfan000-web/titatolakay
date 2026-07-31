import {
  NextResponse
} from "next/server";


export const runtime = "nodejs";

export const dynamic = "force-dynamic";


import {
  adminDB,
  adminAuth
} from "@/lib/firebaseAdmin";


import {
  sendPushNotification
} from "@/lib/broadcastNotification";


import {
  addMonthlyPoints
} from "@/lib/monthlyChampion";


import {
  validateWinner,
  determineWinner
} from "@/lib/gameValidation";



const COMMISSION_RATE = 0.25;



export async function POST(
  request: Request
) {


try {



const {
  gameId
} = await request.json();





if(!gameId){


return NextResponse.json(
{
error:"GameId manquant"
},
{
status:400
}
);


}






const authHeader =
request.headers.get(
"authorization"
);




if(!authHeader){


return NextResponse.json(
{
error:"Non connecté"
},
{
status:401
}
);


}





const token =
authHeader.replace(
"Bearer ",
""
);





await adminAuth.verifyIdToken(
token
);








// ===============================
// CHARGER LA PARTIE
// ===============================


const roomRef =
adminDB.ref(
`rooms/${gameId}`
);



const roomSnap =
await roomRef.get();




if(!roomSnap.exists()){


return NextResponse.json(
{
error:"Partie introuvable"
},
{
status:404
}
);


}





const room =
roomSnap.val();








if(
room.game?.status !== "finished"
){


return NextResponse.json(
{
error:"Partie non terminée"
},
{
status:400
}
);


}








// ===============================
// ANTI DOUBLE PAIEMENT
// ===============================


const paymentRef =
adminDB.ref(
`rooms/${gameId}/game/paymentStatus`
);





const lock =
await paymentRef.transaction(
(current:any)=>{


if(
current === "completed" ||
current === "processing"
){


return;


}



return "processing";



}
);






if(!lock.committed){



return NextResponse.json(
{
error:"Paiement déjà traité"
},
{
status:409
}
);


}// ===============================
// VALIDER GAGNANT CÔTÉ SERVEUR
// ===============================

const board = room.game?.board || {};
const declaredWinner = room.game?.winner;

if (!declaredWinner) {
  await paymentRef.set(null);
  
  return NextResponse.json({
    error: "Gagnant non déclaré"
  }, {
    status: 400
  });
}

// Validation serveur du gagnant pour empêcher la triche
const actualWinner = determineWinner(board);

console.log("[VALIDATION_DEBUG] Validation du gagnant:", {
  gameId,
  declaredWinner,
  actualWinner,
  boardSize: Object.keys(board).length,
  boardSample: Object.entries(board).slice(0, 5)
});

// Validation active du gagnant
const isValidWinner = validateWinner(board, declaredWinner);

if (!isValidWinner) {
  console.error("[SECURITY] Gagnant invalide détecté", {
    gameId,
    declaredWinner,
    board
  });
  
  await paymentRef.set(null);
  
  return NextResponse.json({
    error: "Résultat invalide - Gagnant non conforme au plateau"
  }, {
    status: 400
  });
}

// ===============================
// TROUVER GAGNANT
// ===============================

const winnerSymbol = declaredWinner;



let winnerUid = "";



Object.entries(
room.players || {}
)
.forEach(
([uid,player]:any)=>{


if(
player.symbol === winnerSymbol
){

winnerUid = uid;

}


}
);





if(!winnerUid){


await paymentRef.set(null);



return NextResponse.json(
{
error:"Gagnant introuvable"
},
{
status:400
}
);


}









// ===============================
// CALCUL DU GAIN
// ===============================

const bet =
Number(room.bet || 0);


// Nouveau système: gagnant reçoit 150% de SA mise
// Exemple: mise 100 HTG → gain = 100 * 1.5 = 150 HTG
// Solde gagnant: 1000 - 100 + 150 = 1050 HTG
// Solde perdant: 1000 - 100 = 900 HTG
const reward = Math.floor(bet * 1.5);

const pot = bet * 2;
const commission = pot - reward;

console.log("[FINISH_PAYMENT_REWARD] Calcul du gain:", {
  bet,
  reward,
  pot,
  commission,
  expectedFormula: `${bet} * 1.5 = ${reward}`
});







if(reward <= 0){



await paymentRef.set(null);



return NextResponse.json(
{
error:"Gain invalide"
},
{
status:400
}
);


}









// ===============================
// CREDIT GAGNANT
// ===============================


const balanceRef =
adminDB.ref(
`users/${winnerUid}/balance`
);



let oldBalance = 0;

let newBalance = 0;



const balanceTransaction =
await balanceRef.transaction(
(current:any)=>{


oldBalance =
Number(current || 0);



newBalance =
oldBalance + reward;


console.log("[PAYMENT_CREDIT] Crédit gagnant:", {
  oldBalance,
  reward,
  newBalance,
  winnerUid
});



return newBalance;



}
);


// Vérifier si la transaction a réussi ET que le solde a été mis à jour
console.log("[PAYMENT_CREDIT_RESULT] Résultat transaction:", {
  committed: balanceTransaction.committed,
  snapshot: balanceTransaction.snapshot?.val(),
  expected: newBalance
});

if (!balanceTransaction.committed || balanceTransaction.snapshot.val() !== newBalance) {
  console.error("[PAYMENT] Échec transaction solde gagnant", { 
    winnerUid, 
    reward, 
    committed: balanceTransaction.committed,
    expectedBalance: newBalance,
    actualBalance: balanceTransaction.snapshot?.val()
  });
  await paymentRef.set(null);
  
  return NextResponse.json({
    error: "Échec du paiement - Transaction solde échouée"
  }, {
    status: 500
  });
}






// ===============================
// TRANSACTION HISTORIQUE
// ===============================


await adminDB
.ref(
`transactions/${winnerUid}`
)
.push({

type:"GAME_WIN",

gameId,

amount:reward,

commission,

oldBalance,

newBalance,

createdAt:Date.now()

});











// ===============================
// STATS GAGNANT
// ===============================


const winnerRef =
adminDB.ref(
`users/${winnerUid}`
);



const winnerSnap =
await winnerRef.get();



const winnerData =
winnerSnap.val() || {};



const wins =
Number(winnerData.wins || 0) + 1;



const winnerGames =
Number(winnerData.gamesPlayed || 0) + 1;



await winnerRef.update({

wins,

gamesPlayed:winnerGames,

winRate:
Math.round(
(wins / winnerGames) * 100
)

});







// ===============================
// CHAMPION DU MOIS
// ===============================


await addMonthlyPoints(
winnerUid,
10
);








await sendPushNotification(
winnerUid,
"🏆 Victoire !",
`Tu as gagné ${reward} HTG`,
{
type:"win",
amount:reward
});// ===============================
// STATS PERDANT
// ===============================
// NOTE: Le perdant a déjà été débité de sa mise lors du join
// via transaction atomique avec le créateur.
// Donc on ne débite PAS le perdant ici, on met juste à jour ses stats
// Le perdant ne reçoit AUCUN crédit supplémentaire


let loserUid = "";



Object.entries(
room.players || {}
)
.forEach(
([uid]:any)=>{


if(uid !== winnerUid){

loserUid = uid;

}


}
);






if(loserUid){



const loserRef =
adminDB.ref(
`users/${loserUid}`
);



const loserSnap =
await loserRef.get();



const loserData =
loserSnap.val() || {};




const loserGames =
Number(loserData.gamesPlayed || 0) + 1;



const loserWins =
Number(loserData.wins || 0);



const loses =
Number(loserData.loses || 0) + 1;






await loserRef.update({

loses,

gamesPlayed:loserGames,

winRate:
Math.round(
(loserWins / loserGames) * 100
)

});







await sendPushNotification(
loserUid,
"😢 Partie terminée",
"Tu as perdu cette partie",
{
type:"lose"
}
);



}









// ===============================
// FERMER PAIEMENT
// ===============================


await roomRef.update({

"game/paymentStatus":
"completed",


"game/winnerUid":
winnerUid,


"game/reward":
reward,


"game/commission":
commission,


"game/pot":
pot,


"game/paidAt":
Date.now()


});








return NextResponse.json({

success:true,

winnerUid,

reward,

commission,

oldBalance,

newBalance

});







}
catch(error:any){



console.error(
"FINISH PAYMENT ERROR",
error
);





return NextResponse.json(
{

error:
error?.message ||
"Erreur serveur"

},
{
status:500
}
);



}



}
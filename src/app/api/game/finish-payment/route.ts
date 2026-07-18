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
  sendNotification
} from "@/lib/notifications";


import {
  addMonthlyPoints
} from "@/lib/monthlyChampion";



const COMMISSION_RATE = 0.10;



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
// TROUVER GAGNANT
// ===============================


const winnerSymbol =
room.game.winner;



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



const players =
Number(room.playersCount || 2);



const pot =
bet * players;



const commission =
Math.floor(
pot * COMMISSION_RATE
);



const reward =
pot - commission;







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



await balanceRef.transaction(
(current:any)=>{


oldBalance =
Number(current || 0);



newBalance =
oldBalance + reward;



return newBalance;



}
);









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








await sendNotification(
winnerUid,
{

title:"🏆 Victoire !",

message:
`Tu as gagné ${reward} HTG`,

type:"win",

amount:reward

}
);// ===============================
// STATS PERDANT
// ===============================


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







await sendNotification(
loserUid,
{

title:"😢 Partie terminée",

message:"Tu as perdu cette partie",

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
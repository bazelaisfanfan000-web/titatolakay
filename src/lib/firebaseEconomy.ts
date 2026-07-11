import {
  ref,
  get,
  set,
  update,
  runTransaction,
  serverTimestamp
} from "firebase/database";

import {
  database
} from "@/lib/firebase";




// ===============================
// CREER USER
// ===============================

async function getOrCreateUser(uid:string){


const userRef = ref(
database,
`users/${uid}`
);


const snap = await get(userRef);



if(!snap.exists()){



const user = {

username:"Joueur",

balance:1000,

currency:"HTG",

createdAt:Date.now()

};



await set(
userRef,
user
);


return user;

}




return snap.val();

}






// ===============================
// SOLDE
// ===============================

export async function checkUserBalance(
uid:string
){

const user =
await getOrCreateUser(uid);


return Math.floor(
Number(user.balance || 0)
);

}






// ===============================
// RETIRER MISE
// ===============================

export async function deductBet(
uid:string,
amount:number,
gameId:string
){


console.log("💸 RETRAIT MISE",{uid,amount,gameId});


const balanceRef =
ref(
database,
`users/${uid}/balance`
);




const result =
await runTransaction(

balanceRef,

(current)=>{


const balance =
Math.floor(
Number(current || 0)
);




if(balance < amount){

return;

}




return Math.floor(
balance - amount
);


}

);




if(!result.committed){

throw new Error(
"Solde insuffisant"
);

}


console.log("✅ Mise retirée avec succès",{uid,amount,newBalance:result.snapshot});



await createTransaction(

uid,

"mise",

-amount,

gameId

);




}






// ===============================
// AJOUTER GAIN
// ===============================

export async function addWinnerReward(

uid:string,

amount:number,

gameId:string

){


console.log("🏆 AJOUT GAIN",{uid,amount,gameId});


const result =
await runTransaction(

ref(
database,
`users/${uid}/balance`
),


(current)=>{


return Math.floor(
Number(current || 0) + amount
);


}

);


console.log("✅ Gain ajouté avec succès",{uid,amount,newBalance:result.snapshot});



await createTransaction(

uid,

"gain",

amount,

gameId

);




}






// ===============================
// PAIEMENT FIN PARTIE
// ===============================

export async function distributeGameWinnings(

roomId:string,

winnerUid:string,

bet:number

){


console.log("🎯 DISTRIBUTION GAIN",{roomId,winnerUid,bet});


const roomRef =
ref(
database,
`rooms/${roomId}`
);




// verrou anti double paiement

const lock =
await runTransaction(

ref(
database,
`rooms/${roomId}/game/paymentDone`
),


(current)=>{


if(current===true){

return;

}


return true;


}

);




if(!lock.committed){


return {
message:"Paiement déjà effectué"
};


}




const snap =
await get(roomRef);




if(!snap.exists()){

throw new Error(
"Partie inexistante"
);

}




const room =
snap.val();





// ===============================
// CALCULS
// ===============================


const mise =
Math.floor(
Number(bet)
);


const pot =
Math.floor(
Number(room.pot || 0)
);


console.log("Mise:",mise);
console.log("Pot:",pot);


// commission 10% du pot

const commission =
Math.floor(
pot * 0.10
);


console.log("Commission:",commission);


// gain gagnant = mise × 1.80

const reward =
Math.floor(
mise * 1.80
);


console.log("Gain gagnant:",reward);
console.log("Gagnant UID:",winnerUid);




// payer gagnant

await addWinnerReward(

winnerUid,

reward,

roomId

);




// verrouiller paiement

await update(

roomRef,

{


"game/paymentDone":true,


"game/reward":reward,


"game/commission":commission,


"game/pot":pot,


"game/winnerUid":winnerUid


}


);


console.log("✅ Paiement terminé avec succès",{winnerUid,reward,pot,commission});




return {

reward,

commission,

pot,

winnerUid

};


}






// ===============================
// TRANSACTION
// ===============================

async function createTransaction(

uid:string,

type:string,

amount:number,

gameId:string

){



await set(

ref(

database,

`transactions/${uid}/${Date.now()}`

),


{


type,


amount,


gameId,


createdAt:
serverTimestamp()


}


);




}

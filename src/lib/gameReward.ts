import {
  ref,
  get,
  update
} from "firebase/database";

import {
  database
} from "@/lib/firebase";



export async function creditWinner(
  uid:string,
  reward:number,
  gameId:string
){

console.log("💰 CREDIT WINNER DEMANDE", {
  uid,
  reward,
  gameId
});


const userRef =
ref(
 database,
 `users/${uid}`
);


const snap =
await get(userRef);



if(!snap.exists()){

throw new Error(
"Utilisateur introuvable"
);

}



const user =
snap.val();



const oldBalance =
Number(user.balance || 0);



const newBalance =
oldBalance + reward;



const updates:any = {};



// ajouter le gain
updates[
`users/${uid}/balance`
]
=
newBalance;



// enregistrer transaction
updates[
`transactions/${uid}/${Date.now()}`
]
=
{
 type:"game_win",
 amount:reward,
 gameId,
 createdAt:Date.now()
};



await update(
ref(database),
updates
);



console.log("✅ GAGNANT PAYE",{
 uid,
 reward,
 newBalance
});


return {
newBalance,
reward
};

}
import {
  ref,
  get,
  set,
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
balance - amount);


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

"game_bet",

-amount,

gameId

);




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

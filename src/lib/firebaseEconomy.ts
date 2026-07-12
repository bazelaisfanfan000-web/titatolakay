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

async function getOrCreateUser(
uid:string
){


const userRef =
ref(
database,
`users/${uid}`
);



const snap =
await get(userRef);



if(!snap.exists()){


const user = {

username:"Joueur",

balance:1000,

currency:"HTG",

uid,

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



const balance =
Math.floor(
Number(user.balance || 0)
);



console.log(
"💰 SOLDE UTILISATEUR:",
{
uid,
balance
}
);



return balance;

}



// ===============================
// RETIRER MISE
// ===============================

export async function deductBet(
uid:string,
amount:number,
gameId:string
){


console.log(
"💸 DEMANDE RETRAIT",
{
uid,
amount,
gameId
}
);



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



console.log(
"🔎 VERIFICATION SOLDE",
{
balance,
amount
}
);



if(balance < amount){


console.log(
"❌ SOLDE INSUFFISANT",
{
balance,
amount
}
);



return null;


}



const newBalance =
Math.floor(
balance - amount
);



console.log(
"✅ NOUVEAU SOLDE",
newBalance
);



return newBalance;


}

);





if(!result.committed){


throw new Error(
"Solde insuffisant"
);


}




console.log(
"✅ MISE RETIREE",
{
uid,
amount,
nouveauSolde:
result.snapshot.val()
}
);




await createTransaction(

uid,

"game_bet",

-amount,

gameId

);



return {

success:true,

balance:
result.snapshot.val()

};


}



// ===============================
// CREER TRANSACTION
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
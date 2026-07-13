import {
 adminDB
} from "./firebaseAdmin";



export async function checkUserBalance(
uid:string
){

const snap =
await adminDB
.ref(`users/${uid}/balance`)
.get();


return Number(
snap.val() || 0
);

}





export async function deductBet(
uid:string,
amount:number,
roomId:string
){


const balanceRef =
adminDB.ref(
`users/${uid}/balance`
);



const snap =
await balanceRef.get();



const balance =
Number(
snap.val() || 0
);



if(balance < amount){

throw new Error(
"Solde insuffisant"
);

}



// retirer UNE SEULE fois

await balanceRef.set(
balance - amount
);




// historique

await adminDB
.ref(`transactions/${uid}`)
.push({

type:"bet",

amount,

roomId,

createdAt:Date.now()

});


return true;

}
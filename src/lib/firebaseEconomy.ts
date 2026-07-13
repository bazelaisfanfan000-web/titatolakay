import {
  adminDB
} from "./firebaseAdmin";





export async function checkUserBalance(
uid:string
){

const snap =
await adminDB
.ref(
`users/${uid}/balance`
)
.get();



if(!snap.exists()){

return 0;

}



return Number(
snap.val()
);

}








export async function deductBet(

uid:string,

amount:number,

roomId:string

){


const userRef =
adminDB.ref(
`users/${uid}`
);



const snap =
await userRef.get();




if(!snap.exists()){

throw new Error(
"Utilisateur introuvable"
);

}



const user =
snap.val();



const balance =
Number(
user.balance || 0
);





if(balance < amount){

throw new Error(
"Solde insuffisant"
);

}





await adminDB
.ref(
`users/${uid}/balance`
)
.set(
balance - amount
);





await adminDB
.ref(
`transactions/${uid}`
)
.push({

type:"bet",

amount,

roomId,

createdAt:
Date.now()

});



}
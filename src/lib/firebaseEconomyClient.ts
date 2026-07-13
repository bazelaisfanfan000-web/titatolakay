import {
  ref,
  get,
  set,
  push
} from "firebase/database";

import {
  rtdb
} from "@/lib/firebase";




export async function checkUserBalance(
uid:string
){


const snap =
await get(
ref(
rtdb,
`users/${uid}/balance`
)
);




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
ref(
rtdb,
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




const balance =
Number(user.balance || 0);




if(balance < amount){

throw new Error(
"Solde insuffisant"
);

}




await set(
ref(
rtdb,
`users/${uid}/balance`
),

balance - amount

);




await push(
ref(
rtdb,
`transactions/${uid}`
),

{


type:"bet",


amount,


roomId,


createdAt:
Date.now()


});


}

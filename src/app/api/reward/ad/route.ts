import { NextResponse } from "next/server";

import {
  adminAuth
} from "@/lib/firebaseAdmin";

import {
  addBalance
} from "@/lib/firebaseEconomyAdmin";

import {
  adminDB
} from "@/lib/firebaseAdmin";



const REWARD_AMOUNT = 50;

const DAILY_LIMIT = 3;



export async function POST(
request:Request
){


try{


const {
token
}
=
await request.json();



if(!token){

return NextResponse.json(
{
error:"Token manquant"
},
{
status:400
}
);

}



// Vérifier Firebase Auth

const decoded =
await adminAuth.verifyIdToken(token);


const uid =
decoded.uid;



// Date du jour

const today =
new Date()
.toISOString()
.split("T")[0];



// Vérifier limite pub

const rewardRef =
adminDB.ref(
`adRewards/${uid}/${today}`
);



const rewardSnap =
await rewardRef.get();



let count =
rewardSnap.exists()
?
Number(rewardSnap.val())
:
0;



if(count >= DAILY_LIMIT){


return NextResponse.json(
{
error:"Tu as atteint la limite de pubs aujourd'hui"
},
{
status:429
}
);


}



// Ajouter +50 HTG

const result =
await addBalance(
uid,
REWARD_AMOUNT,
"ad_reward"
);




// Sauvegarder compteur

await rewardRef.set(
count + 1
);



return NextResponse.json({

success:true,

message:"+50 HTG ajouté",

balance:
result.newBalance

});



}
catch(error){


console.error(
"AD REWARD ERROR",
error
);



return NextResponse.json(
{
error:"Erreur serveur"
},
{
status:500
}
);


}


}
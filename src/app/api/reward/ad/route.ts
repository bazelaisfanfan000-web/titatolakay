import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDB
} from "@/lib/firebaseAdmin";

import {
  addBalance
} from "@/lib/firebaseEconomyAdmin";



const REWARD_AMOUNT = 5;

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






// Vérification Firebase

const decoded =

await adminAuth.verifyIdToken(token);



const uid =

decoded.uid;







// Date du jour

const today =

new Date()
.toISOString()
.split("T")[0];







// Vérification limite pub

const rewardRef =

adminDB.ref(
`adRewards/${uid}/${today}`
);




const rewardSnap =

await rewardRef.get();




let count =

rewardSnap.exists()

?

Number(
rewardSnap.val()
)

:

0;







if(count >= DAILY_LIMIT){



return NextResponse.json(
{

error:
"Limite pub atteinte"

},
{
status:429
}
);


}








// Ajouter +5 HTG


const result =

await addBalance(

uid,

REWARD_AMOUNT,

"ad_reward"

);







// Sauvegarde compteur

await rewardRef.set(

count + 1

);







return NextResponse.json({

success:true,

message:"+5 HTG ajouté",

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
import {
  NextResponse
} from "next/server";


export const runtime = "nodejs";

export const dynamic = "force-dynamic";


import {
  adminDB
} from "@/lib/firebaseAdmin";


import {
  adminAuth
} from "@/lib/firebaseAuthAdmin";


import {
  addBalance
} from "@/lib/firebaseEconomyAdmin";



const REWARD_AMOUNT = 5;

const DAILY_LIMIT = 3;



export async function POST(
  request: Request
){

try{


const body =
await request.json();


const token =
body?.token;



if(!token){

return NextResponse.json(
{
success:false,
error:"Token manquant"
},
{
status:400
}
);

}



// ===============================
// AUTH FIREBASE
// ===============================


const decoded =
await adminAuth.verifyIdToken(
token
);


const uid =
decoded.uid;




// ===============================
// LIMITE PUB JOUR
// ===============================


const today =
new Date()
.toISOString()
.split("T")[0];



const rewardRef =
adminDB.ref(
`adRewards/${uid}/${today}`
);



const snap =
await rewardRef.get();



let count =
snap.exists()
?
Number(snap.val())
:
0;



if(count >= DAILY_LIMIT){

return NextResponse.json(
{
success:false,
error:"Limite pub atteinte"
},
{
status:429
}
);

}




// ===============================
// AJOUT +5 HTG
// ===============================


const result =
await addBalance(
uid,
REWARD_AMOUNT,
"ad_reward"
);





await rewardRef.set(
count + 1
);






return NextResponse.json({

success:true,

message:"+5 HTG ajouté",

reward:REWARD_AMOUNT,

balance:
result.newBalance,

ads:
count + 1

});



}
catch(error:any){


console.error(
"[AD REWARD ERROR]",
error
);



return NextResponse.json(
{
success:false,
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
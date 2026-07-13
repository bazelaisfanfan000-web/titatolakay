import {
  NextResponse
} from "next/server";

import crypto from "crypto";

import {
  adminDB
} from "@/lib/firebaseAdmin";



export async function POST(
request: Request
){

try{


// récupérer le corps brut pour vérifier HMAC
const rawBody =
await request.text();



const signature =
request.headers.get(
"X-MCC-Signature"
);



const timestamp =
request.headers.get(
"X-MCC-Timestamp"
);



if(
!signature ||
!timestamp
){

return NextResponse.json(
{
error:"Signature manquante"
},
{
status:401
}
);

}



// Vérification HMAC

const expected =

"sha256=" +

crypto
.createHmac(
"sha256",
process.env.MCC_WEBHOOK_SECRET!
)
.update(rawBody)
.digest("hex");



if(
signature !== expected
){

return NextResponse.json(
{
error:"Signature invalide"
},
{
status:401
}
);

}



// maintenant on parse

const event =
JSON.parse(rawBody);



console.log(
"MONCASH EVENT",
event
);




// seulement paiement réussi

if(
event.event !==
"payment.completed"
){

return NextResponse.json(
{
received:true
}
);

}




const reference =
event.reference;



const amount =
Number(event.amount);





// retrouver la transaction

const transactionRef =
adminDB.ref(`pendingDeposits/${reference}`);



const snapshot =
await transactionRef.get();



if(
!snapshot.exists()
){

return NextResponse.json(
{
error:"Transaction inconnue"
},
{
status:404
}
);

}



const deposit =
snapshot.val();




// éviter double crédit

if(
deposit.status === "completed"
){

return NextResponse.json(
{
alreadyProcessed:true
}
);

}




const uid =
deposit.uid;



// récupérer wallet

const walletRef =
adminDB.ref(`wallets/${uid}`);



const walletSnap =
await walletRef.get();



const oldBalance =

walletSnap.exists()

?

Number(
walletSnap.val().balance || 0
)

:

0;



const newBalance =

oldBalance + amount;




// mise à jour wallet

await walletRef.update({

balance:newBalance

});





// transaction historique

const historyRef =
adminDB.ref(`transactions/${uid}`);



await historyRef.push({

type:"deposit",

amount,

provider:"MonCash",

reference,

status:"completed",

createdAt:Date.now()

});




// fermer dépôt en attente

await transactionRef.update({

status:"completed",

completedAt:Date.now()

});




// notification

const notificationRef =
adminDB.ref(`notifications/${uid}`);



await notificationRef.push({

title:"Dépôt confirmé",

message:
`Votre dépôt de ${amount} HTG est arrivé.`,

type:"deposit",

read:false,

createdAt:Date.now()

});





return NextResponse.json(
{
success:true
}
);



}catch(error:any){


console.error(
"WEBHOOK ERROR",
error
);



return NextResponse.json(
{
error:error.message
},
{
status:500
}
);


}


}
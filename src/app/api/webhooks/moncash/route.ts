import {
  NextResponse,
} from "next/server";


import crypto from "crypto";


import {
  adminDB,
} from "@/lib/firebaseAdmin";


import {
  creditWallet,
} from "@/lib/wallet";



export const runtime =
"nodejs";




const WEBHOOK_SECRET =
process.env.MCC_WEBHOOK_SECRET ||
process.env.MCC_WEBHOOK_SECRE ||
"";





/*
====================================================
VERIFICATION SIGNATURE MONCASH
====================================================
*/


function verifyWebhook(

body:string,

signature:string | null

){


if(
!WEBHOOK_SECRET ||
!signature
){

return false;

}



const expected =

crypto
.createHmac(
"sha256",
WEBHOOK_SECRET
)
.update(
body
)
.digest(
"hex"
);



return crypto.timingSafeEqual(

Buffer.from(expected),

Buffer.from(signature)

);


}







export async function POST(

request:Request

){


try {



const rawBody =
await request.text();



const signature =
request.headers.get(
"x-webhook-signature"
);





/*
====================================================
SECURITE
====================================================
*/


if(
!verifyWebhook(
rawBody,
signature
)
){


console.error(
"Webhook MonCash signature invalide"
);



return NextResponse.json(

{
success:false,
error:
"Signature invalide"
},

{
status:401
}

);


}





const data =
JSON.parse(
rawBody
);





console.log(
"MONCASH WEBHOOK:",
data
);





/*
====================================================
RECUPERATION DONNEES
====================================================
*/


const referenceId =

data.referenceId ||
data.reference ||
data.transactionId;



const status =

data.status ||
data.paymentStatus;





if(
!referenceId
){


return NextResponse.json(

{
success:false,
error:
"Reference absente"
},

{
status:400
}

);


}





/*
====================================================
CHERCHER TRANSACTION
====================================================
*/


const usersSnapshot =

await adminDB
.ref(
"transactions"
)
.once(
"value"
);



let transaction:any = null;

let uid:string | null = null;



usersSnapshot.forEach(

(user:any)=>{


const transactions =
user.val();


Object.values(
transactions
).forEach(
(tx:any)=>{


if(
tx.id === referenceId
){

transaction = tx;

uid =
tx.uid;

}


});


}

);





if(
!transaction ||
!uid
){


return NextResponse.json(

{
success:false,
error:
"Transaction introuvable"
},

{
status:404
}

);


}







/*
====================================================
ANTI DOUBLE CREDIT
====================================================
*/


if(
transaction.status ===
"completed"
){


return NextResponse.json(

{
success:true,
message:
"Paiement déjà traité"
}

);


}






/*
====================================================
PAIEMENT REFUSE
====================================================
*/


if(

status !== "completed"

&&

status !== "success"

){



await adminDB
.ref(
`transactions/${uid}/${referenceId}`
)
.update({

status:
"failed",

updatedAt:
Date.now()

});




return NextResponse.json(

{
success:true,
message:
"Paiement non validé"
}

);


}








/*
====================================================
CREDIT WALLET
====================================================
*/


await creditWallet(

uid,

Number(
transaction.amount
),

"deposit",

"Recharge MonCash",

{

reference:
referenceId

}

);







/*
====================================================
UPDATE TRANSACTION
====================================================
*/


await adminDB
.ref(
`transactions/${uid}/${referenceId}`
)
.update({

status:
"completed",

completedAt:
Date.now()

});







return NextResponse.json(

{

success:true,

message:
"Wallet crédité"

}

);



}
catch(error){



console.error(
"MONCASH WEBHOOK ERROR",
error
);



return NextResponse.json(

{

success:false,

error:
"Erreur webhook"

},

{
status:500
}

);


}


}
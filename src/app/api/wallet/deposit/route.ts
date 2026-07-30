import {
  NextResponse,
} from "next/server";


import {
  adminAuth,
  adminDB,
} from "@/lib/firebaseAdmin";


import {
  createMonCashPayment,
} from "@/lib/moncash";



export const runtime = "nodejs";



/*
====================================================
TiTaTo - CREATE DEPOSIT MONCASH
====================================================

POST /api/wallet/deposit

Headers:

Authorization: Bearer Firebase_ID_TOKEN


Body:

{
 amount: 50
}


Flux:

Client
 ↓
Firebase Auth
 ↓
Créer transaction pending
 ↓
MonCash pay-create
 ↓
Retour paymentUrl
 ↓
Client paie
 ↓
Webhook
 ↓
Crédit wallet

====================================================
*/



export async function POST(
request:Request
){


try {



/*
====================================================
AUTH FIREBASE
====================================================
*/


const authorization =
request.headers.get(
"Authorization"
);



if(
!authorization ||
!authorization.startsWith(
"Bearer "
)
){


return NextResponse.json(

{

success:false,

error:
"Authentification requise."

},

{
status:401
}

);


}



const token =
authorization.substring(7);



const decoded =
await adminAuth.verifyIdToken(
token
);



const uid =
decoded.uid;




/*
====================================================
BODY
====================================================
*/


const body =
await request.json();



const amount =
Number(
body.amount
);




/*
====================================================
VALIDATION MONTANT
====================================================
*/


if(

!Number.isInteger(amount)

||

amount < 25

){


return NextResponse.json(

{

success:false,

error:
"Le dépôt minimum est de 25 HTG."

},

{
status:400
}

);


}



if(
amount > 100000
){


return NextResponse.json(

{

success:false,

error:
"Le dépôt maximum est de 100000 HTG."

},

{
status:400
}

);


}




/*
====================================================
REFERENCE UNIQUE
====================================================
*/


const referenceId =

`TT_DEP_${Date.now()}_${uid.slice(0,8)}`;




/*
====================================================
CREER TRANSACTION PENDING
====================================================
*/


await adminDB
.ref(
`transactions/${uid}/${referenceId}`
)
.set({

id:
referenceId,


uid,


type:
"deposit",


amount,


status:
"pending",


provider:
"moncashconnect",


createdAt:
Date.now()

});





/*
====================================================
CREATION PAIEMENT MONCASH
====================================================
*/


let payment;



try {


payment =
await createMonCashPayment(

amount,

referenceId,

"TiTaTo Wallet"

);



}

catch(error:any){



console.error(

"[MONCASH_CREATE_ERROR]",

error

);



await adminDB
.ref(
`transactions/${uid}/${referenceId}`
)
.update({

status:
"failed",

error:
String(
error.message || error
)

});



return NextResponse.json(

{

success:false,

error:
"Impossible de créer le paiement MonCash.",


details:
error.message

},

{
status:500
}

);



}





/*
====================================================
VERIFIER URL PAIEMENT
====================================================
*/


if(
!payment.paymentUrl
){


await adminDB
.ref(
`transactions/${uid}/${referenceId}`
)
.update({

status:
"failed",

error:
"paymentUrl absent"

});



return NextResponse.json(

{

success:false,

error:
"MonCash n'a pas retourné de lien paiement."

},

{
status:500
}

);


}




/*
====================================================
SUCCES
====================================================
*/


console.log(

"[DEPOSIT_CREATED]",

{

uid,

amount,

referenceId,

paymentUrl:
payment.paymentUrl

}

);




return NextResponse.json(

{

success:true,


paymentUrl:
payment.paymentUrl,


referenceId,


amount,


message:
"Paiement MonCash créé avec succès."

},

{
status:200
}

);



}
catch(error){



console.error(

"[DEPOSIT_SERVER_ERROR]",

error

);



return NextResponse.json(

{

success:false,

error:
"Erreur serveur dépôt."

},

{
status:500
}

);



}


}
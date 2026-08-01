/**
 * API Route: Création retrait wallet
 * POST /api/wallet/withdraw
 */

import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDB
} from "@/lib/firebaseAdmin";

import {
  createMonCashPayout,
  generateReferenceId,
  generateIdempotencyKey
} from "@/lib/moncash";

import {
  atomicWithdrawal
} from "@/lib/atomicTransaction";

import {
  hasAvailableBalance,
  creditWallet
} from "@/lib/wallet";

import {
  transactionExists
} from "@/lib/ledger";

import {
  rateLimitMiddleware,
  RATE_LIMIT_CONFIGS
} from "@/lib/rateLimit";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const MIN_WITHDRAW = 100;
const MAX_WITHDRAW = 100000;

const DAILY_WITHDRAW_LIMIT = 200000;



export async function POST(
  request: Request
) {

try {


/*
================================
1 - RATE LIMIT
================================
*/

const rate =
await rateLimitMiddleware(
  request,
  "withdraw",
  RATE_LIMIT_CONFIGS.withdraw
);


if(!rate.allowed){

return NextResponse.json(
{
error:"Trop de requêtes"
},
{
status:429
}
);

}





/*
================================
2 - AUTH FIREBASE
================================
*/


const auth =
request.headers.get(
"authorization"
);


if(
!auth ||
!auth.startsWith("Bearer ")
){

return NextResponse.json(
{
error:"Non autorisé"
},
{
status:401
}
);

}



const token =
auth.substring(7);



const decoded =
await adminAuth.verifyIdToken(
token
);



const userId =
decoded.uid;







/*
================================
3 - BODY
================================
*/


const body =
await request.json();



let amount =
Number(body.amount);



if(
!Number.isInteger(amount)
){

return NextResponse.json(
{
error:"Le montant doit être un entier"
},
{
status:400
}
);

}




if(
amount < MIN_WITHDRAW ||
amount > MAX_WITHDRAW
){

return NextResponse.json(
{
error:
`Le retrait doit être entre ${MIN_WITHDRAW} et ${MAX_WITHDRAW} HTG`
},
{
status:400
}
);

}








/*
================================
4 - FORMAT NUMERO MONCASH
================================
*/


let cleanNumber =
String(
body.moncashNumber || ""
)
.replace(/\D/g,"");


// Accepte 8 chiffres
// Exemple: 49289375

if(
cleanNumber.length === 8
){

cleanNumber =
"509" + cleanNumber;

}



// Vérification finale

if(
!/^509\d{8}$/.test(cleanNumber)
){

return NextResponse.json(
{
error:
"Numéro MonCash invalide. Entrez les 8 chiffres après +509"
},
{
status:400
}
);

}








/*
================================
5 - VERIFICATION SOLDE
================================
*/


const balance =
await hasAvailableBalance(
userId,
amount
);



if(!balance){

return NextResponse.json(
{
error:"Solde insuffisant"
},
{
status:400
}
);

}








/*
================================
6 - LIMITE JOURNALIERE
================================
*/


const startDay =
new Date();


startDay.setHours(
0,
0,
0,
0
);



const snapshot =
await adminDB
.ref(
`withdrawals/${userId}`
)
.orderByChild(
"createdAt"
)
.startAt(
startDay.getTime()
)
.once(
"value"
);



let totalToday = 0;



if(snapshot.exists()){


snapshot.forEach(
(child:any)=>{


const withdrawal =
child.val();


if(
withdrawal.status !== "failed"
){

totalToday +=
Number(
withdrawal.amount || 0
);

}


});


}




if(
totalToday + amount >
DAILY_WITHDRAW_LIMIT
){

return NextResponse.json(
{
error:
`Limite journalière dépassée (${DAILY_WITHDRAW_LIMIT} HTG)`
},
{
status:400
}
);

}









/*
================================
7 - IDENTIFIANTS
================================
*/


const referenceId =
generateReferenceId(
"withdraw"
);



const idempotencyKey =
generateIdempotencyKey();






console.log(
"[WITHDRAW REQUEST]",
{
userId,
amount,
moncashNumber:cleanNumber,
referenceId
}
);









/*
================================
8 - EVITER DOUBLE TRANSACTION
================================
*/


const exists =
await transactionExists(
userId,
referenceId
);



if(exists){

return NextResponse.json(
{
error:
"Transaction déjà existante"
},
{
status:409
}
);

}








/*
================================
9 - DEBIT ATOMIQUE (AVANT PAYOUT)
================================
*/


const atomic =
await atomicWithdrawal(
{

userId,

amount,

moncashNumber:
cleanNumber,

referenceId,

idempotencyKey

}
);




if(!atomic.success){

return NextResponse.json(
{
error:
atomic.error ||
"Erreur débit wallet"
},
{
status:400
}
);

}








console.log(
"[WITHDRAW DEBIT SUCCESS]",
{
userId,
amount,
newBalance:atomic.newBalance
}
);









/*
================================
10 - CREATION PAYOUT MONCASH
================================
*/


let payout;



try{


payout =
await createMonCashPayout(
{

amount,

moncashNumber:
cleanNumber,

referenceId

},

idempotencyKey

);



}

catch(error){


console.error(
"[MONCASH PAYOUT ERROR]",
error
);



// REMBOURSEMENT AUTOMATIQUE SI PAYOUT ÉCHOUE
await creditWallet(
userId,
amount,
referenceId,
`Remboursement retrait échoué - ${cleanNumber}`
);


await adminDB
.ref(
`withdrawals/${userId}/${referenceId}`
)
.update(
{
status:"failed",
failureReason:
error instanceof Error
?error.message
:"Erreur MonCashConnect",
failedAt:Date.now()
}
);


return NextResponse.json(
{
error:
"MonCashConnect a refusé le retrait. Votre solde a été remboursé.",
details:
error instanceof Error
?error.message
:"Erreur inconnue"

},
{
status:400
}
);


}









/*
================================
11 - SAUVEGARDE
================================
*/


await adminDB
.ref(
`withdrawals/${userId}/${referenceId}`
)
.set(
{

userId,

amount,

moncashNumber:
cleanNumber,

referenceId,


moncashReference:
payout.payout.reference,


status:
"queued",


fee:
payout.payout.fee_htg || 0,


netAmount:
payout.payout.net_htg || amount,


createdAt:
Date.now()


}
);








console.log(
"[WITHDRAW SUCCESS]",
{
referenceId,
payout:
payout.payout.reference
}
);







return NextResponse.json(
{

success:true,


withdrawalId:
referenceId,


reference:
payout.payout.reference,


status:
"queued",


amount


}
);




}

catch(error){


console.error(
"[WITHDRAW ERROR]",
error
);



return NextResponse.json(
{

success:false,

error:
error instanceof Error
?
error.message
:
"Erreur serveur"

},
{
status:500
}
);


}


}
import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";


import {
  checkAdmin
} from "@/lib/checkAdmin";

import {
  sendPushNotification
} from "@/lib/broadcastNotification";

import {
  createLedgerEntry,
  recalculateBalanceFromLedger
} from "@/lib/financialLedger";

import {
  createAuditLog,
  AuditActions
} from "@/lib/auditLogger";


export async function POST(
request:Request
){


try{


const body =
await request.json();


const {
adminUid,
amount,
message
}=body;




if(
!adminUid ||
!amount
){


return NextResponse.json(

{
error:"Informations manquantes"
},

{
status:400
}


);




}




// Valider le montant
const numericAmount = Number(amount);
if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
  return NextResponse.json(
    {
      error: "Montant invalide - doit être positif"
    },
    {
      status: 400
    }
  );
}

if (numericAmount > 10000) {
  return NextResponse.json(
    {
      error: "Montant trop élevé - maximum 10,000 HTG"
    },
    {
      status: 400
    }
  );
}

// Vérifier que c'est un admin

await checkAdmin(
adminUid);




const usersSnap =

await adminDB

.ref("users")

.once("value");




const users =
usersSnap.val() || {};




const updates:any = {};




const notificationPromises:any[] = [];
const ledgerPromises:any[] = [];
const auditPromises:any[] = [];




Object.entries(users)

.forEach(
([uid,user]:any)=>{


const oldBalance =

Number(
user.balance || 0
);
const newBalance = Math.floor(oldBalance + Number(amount));





updates[

`users/${uid}/balance`

]

=

newBalance;




notificationPromises.push(
sendPushNotification(
uid,
"📢 Message Wincash",
message || "Bienvenue dans la nouvelle version",
{
type:"system",
amount:Number(amount)
}
));

// Créer entrée ledger pour ce reward
const ledgerRef = adminDB.ref(`ledger/${uid}`).push();
ledgerPromises.push(
  ledgerRef.set({
    id: ledgerRef.key,
    uid,
    type: "reward",
    amount: Number(amount),
    balanceBefore: oldBalance,
    balanceAfter: newBalance,
    reference: `admin_reward_${Date.now()}`,
    status: "completed",
    metadata: { adminUid, message },
    createdAt: Date.now(),
    completedAt: Date.now()
  })
);

// Log d'audit admin
auditPromises.push(
  createAuditLog(
    adminUid,
    AuditActions.BALANCE_MODIFIED,
    {
      targetUid: uid,
      amount: Number(amount),
      oldBalance,
      newBalance,
      reason: "admin_reward"
    },
    "success"
  )
);





});




await adminDB

.ref()

.update(
updates
);

await Promise.all(notificationPromises);
await Promise.all(ledgerPromises);
await Promise.all(auditPromises);

return NextResponse.json({
success:true,


players:

Object.keys(users).length,


total:

Object.keys(users).length
*
Number(amount)




});



}

catch(error:any){


console.error(error);




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

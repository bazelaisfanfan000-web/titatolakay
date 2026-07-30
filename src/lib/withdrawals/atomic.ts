/*
====================================================
TiTaTo - Atomic Withdrawal Operations
====================================================

Gestion atomique des retraits.

Correction :
- Réservation atomique sur users/{uid}
- balance + reservedBalance dans une seule transaction
- évite les doubles retraits
- évite les incohérences de solde

====================================================
*/


import {
  getDatabase,
} from "firebase-admin/database";



/*
====================================================
TYPES
====================================================
*/


export type WithdrawalReservationReason =

  | "insufficient_balance"
  | "active_withdrawal"
  | "invalid_amount"
  | "already_reserved"
  | "user_not_found"
  | "database_error";



export interface ReserveWithdrawalInput {

  uid:string;

  withdrawalId:string;

  amount:number;

  referenceId:string;

  moncashNumber:string;

}



export interface ReserveWithdrawalSuccess {

  success:true;

  withdrawalId:string;

}



export interface ReserveWithdrawalFailure {

  success:false;

  reason:WithdrawalReservationReason;

}



export type ReserveWithdrawalResult =
ReserveWithdrawalSuccess |
ReserveWithdrawalFailure;



const ACTIVE_WITHDRAWAL_STATUSES =
new Set([

"pending",

"processing",

"refund_pending"

]);



/*
====================================================
VALIDATION
====================================================
*/


function isValidAmount(
amount:number
){

return (

typeof amount==="number" &&

Number.isFinite(amount) &&

amount>0

);

}



function isValidUid(
uid:string
){

return (

typeof uid==="string" &&

uid.trim().length>0

);

}



function isValidId(
value:string
){

return (

typeof value==="string" &&

value.trim().length>0

);

}



/*
====================================================
RÉSERVER UN RETRAIT
====================================================
*/


export async function reserveWithdrawal(

input:ReserveWithdrawalInput

):Promise<ReserveWithdrawalResult>{



const {

uid,

withdrawalId,

amount,

referenceId,

moncashNumber

}=input;



if(
!isValidUid(uid)
){

return {

success:false,

reason:"user_not_found"

};

}



if(
!isValidAmount(amount)
){

return {

success:false,

reason:"invalid_amount"

};

}



if(
!isValidId(withdrawalId)
||
!isValidId(referenceId)
){

return {

success:false,

reason:"database_error"

};

}



if(
!moncashNumber ||
moncashNumber.trim().length < 8
){

return {

success:false,

reason:"invalid_amount"

};

}



const db =
getDatabase();



/*
====================================================
1. Vérifier retrait existant
====================================================
*/


const existing =

await db
.ref(
`withdrawals/${withdrawalId}`
)
.get();



if(
existing.exists()
){

return {

success:false,

reason:"already_reserved"

};

}



/*
====================================================
2. Vérifier retrait actif
====================================================
*/


const activeSnapshot =

await db
.ref("withdrawals")
.orderByChild("uid")
.equalTo(uid)
.get();



if(
activeSnapshot.exists()
){

const list =
activeSnapshot.val();


for(
const item of Object.values(list)
){

if(
item &&
typeof item==="object" &&
ACTIVE_WITHDRAWAL_STATUSES.has(
(item as any).status
)
){

return {

success:false,

reason:"active_withdrawal"

};

}

}

}



/*
====================================================
3. RÉSERVATION ATOMIQUE CORRIGÉE
====================================================
*/


let failureReason:
WithdrawalReservationReason |
null = null;



const userRef =

db.ref(
`users/${uid}`
);



const transactionResult =

await userRef.transaction(

(currentUser)=>{


if(
!currentUser
){

failureReason =
"user_not_found";


return;

}



const balance =

Number(
currentUser.balance ?? 0
);



const reservedBalance =

Number(
currentUser.reservedBalance ?? 0
);



if(
!Number.isFinite(balance)
){

failureReason =
"database_error";


return;

}



if(
!Number.isFinite(reservedBalance)
){

failureReason =
"database_error";


return;

}



const availableBalance =

balance -
reservedBalance;



if(
availableBalance < amount
){

failureReason =
"insufficient_balance";


return;

}



return {

...currentUser,


reservedBalance:

reservedBalance + amount


};


}

);



if(
!transactionResult.committed
){

return {

success:false,

reason:
failureReason ??
"database_error"

};

}


/*
====================================================
4. CRÉATION DU RETRAIT
====================================================
*/


const now =
Date.now();



try{


await db
.ref(
`withdrawals/${withdrawalId}`
)
.set({

id:withdrawalId,

uid,

amount,

referenceId,

moncashNumber,


status:"pending",

providerStatus:"pending",


feeHtg:0,

totalCostHtg:amount,


createdAt:now,

updatedAt:now,

reservedAt:now,


payoutId:null,

completedAt:null,

refundedAt:null,

errorMessage:null


});



}catch(error){


console.error(
"[WITHDRAWAL_CREATE_ERROR]",
error
);



await releaseReservedWithdrawalAmount(

uid,

amount

);



return {

success:false,

reason:"database_error"

};


}



return {

success:true,

withdrawalId

};


}/*
====================================================
FINALISER UN RETRAIT RÉUSSI
====================================================
*/

export async function completeWithdrawal(
  withdrawalId: string,
  payoutId?: string,
  feeHtg?: number,
): Promise<boolean> {

  const db = getDatabase();


  const withdrawalRef =
    db.ref(
      `withdrawals/${withdrawalId}`,
    );


  const snapshot =
    await withdrawalRef.get();


  if (!snapshot.exists()) {
    return false;
  }


  const withdrawal =
    snapshot.val();


  if (
    !withdrawal.uid ||
    !withdrawal.amount
  ) {
    return false;
  }


  if (
    withdrawal.status === "completed"
  ) {
    return true;
  }


  /*
  Transaction retrait
  */

  const withdrawalResult =
    await withdrawalRef.transaction(
      (current) => {

        if (!current) {
          return;
        }


        if (
          current.status === "completed"
        ) {
          return current;
        }


        if (
          current.status === "refunded"
        ) {
          return current;
        }


        return {

          ...current,

          status:
            "completed",

          providerStatus:
            "completed",

          payoutId:
            payoutId ??
            current.payoutId,

          feeHtg:
            feeHtg ??
            current.feeHtg,

          completedAt:
            Date.now(),

          updatedAt:
            Date.now(),

        };

      },
    );


  if (
    !withdrawalResult.committed
  ) {
    return false;
  }



  /*
  Débit réel du wallet
  */

  const balanceRef =
    db.ref(
      `users/${withdrawal.uid}/balance`,
    );


  const balanceResult =
    await balanceRef.transaction(
      (balance) => {

        const current =
          Number(balance || 0);


        if (
          current <
          withdrawal.amount
        ) {
          return;
        }


        return (
          current -
          withdrawal.amount
        );

      },
    );


  if (
    !balanceResult.committed
  ) {

    console.error(
      "[WITHDRAWAL_BALANCE_DEBIT_FAILED]",
      withdrawalId,
    );

    return false;
  }



  /*
  Libérer réservation
  */

  await releaseReservedWithdrawalAmount(

    withdrawal.uid,

    withdrawal.amount,

  );


  return true;
}




/*
====================================================
LIBÉRER RESERVED BALANCE
====================================================
*/


export async function releaseReservedWithdrawalAmount(
  uid:string,
  amount:number,
):Promise<boolean>{


  const db =
    getDatabase();


  const ref =
    db.ref(
      `users/${uid}/reservedBalance`,
    );


  const result =
    await ref.transaction(
      (current)=>{


        const reserved =
          Number(
            current || 0,
          );


        return Math.max(
          0,
          reserved - amount,
        );

      },
    );


  return result.committed;

}





/*
====================================================
PASSER EN PROCESSING
====================================================
*/


export async function markWithdrawalProcessing(
 withdrawalId:string,
):Promise<boolean>{


 const db =
   getDatabase();


 const ref =
   db.ref(
    `withdrawals/${withdrawalId}`,
   );


 const result =
 await ref.transaction(
  (withdrawal)=>{


    if(
      !withdrawal
    ){
      return;
    }


    if(
      withdrawal.status === "completed"
    ){
      return withdrawal;
    }


    return {

      ...withdrawal,

      status:
        "processing",

      updatedAt:
        Date.now(),

    };

  });


 return result.committed;

}





/*
====================================================
MARQUER FAILED
====================================================
*/


export async function markWithdrawalFailed(
 withdrawalId:string,
 errorMessage:string,
):Promise<boolean>{


 const db =
   getDatabase();


 const ref =
   db.ref(
    `withdrawals/${withdrawalId}`,
   );


 const result =
 await ref.transaction(
  (withdrawal)=>{


    if(
      !withdrawal
    ){
      return;
    }


    if(
      withdrawal.status === "completed"
    ){
      return withdrawal;
    }


    return {

      ...withdrawal,

      status:
        "failed",

      providerStatus:
        "failed",

      errorMessage,

      updatedAt:
        Date.now(),

    };

  });


 return result.committed;

}





/*
====================================================
REMBOURSEMENT RETRAIT ÉCHOUÉ
====================================================
*/


export async function refundFailedWithdrawal(
withdrawalId:string,
){

const db =
 getDatabase();


const withdrawalRef =
 db.ref(
  `withdrawals/${withdrawalId}`,
 );


const snapshot =
 await withdrawalRef.get();


if(
 !snapshot.exists()
){

 return {

  success:false,

  status:"not_found",

 };

}


const withdrawal =
 snapshot.val();



if(
 withdrawal.status === "refunded"
){

 return {

  success:true,

  status:"already_refunded",

 };

}



if(
 withdrawal.status !== "failed" &&
 withdrawal.status !== "refund_pending"
){

 return {

  success:false,

  status:"invalid_state",

 };

}



/*
Protection transaction
*/

const claim =
await withdrawalRef.transaction(
(current)=>{


 if(
  !current
 ){
  return;
 }


 if(
  current.refundProcessing
 ){

  return current;

 }



 return {

  ...current,

  refundProcessing:true,

  updatedAt:
   Date.now(),

 };

});



if(
 !claim.committed
){

 return {

  success:false,

  status:"error",

 };

}



/*
Restituer réservation uniquement

PAS de création d'argent
*/

const released =
await releaseReservedWithdrawalAmount(

 withdrawal.uid,

 withdrawal.amount,

);



if(
 !released
){

 return {

  success:false,

  status:"refund_pending",

 };

}



/*
Finalisation
*/

await withdrawalRef.update({

 status:
  "refunded",

 refundProcessing:
  false,

 refundedAt:
  Date.now(),

 updatedAt:
  Date.now(),

});



return {

 success:true,

 status:"refunded",

};

}
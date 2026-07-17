import {
  adminDB
} from "@/lib/firebaseAdmin";



// ===============================
// VERIFIER LE SOLDE
// ===============================

export async function checkUserBalance(
  uid:string
){

  const ref =
  adminDB.ref(
    `users/${uid}/balance`
  );


  const snap =
  await ref.get();


  return Number(
    snap.val() || 0
  );

}



// ===============================
// RETIRER UNE MISE
// ===============================

export async function deductBet(

  uid:string,

  amount:number,

  gameId:string = "game"

){

  if(amount <= 0){

    throw new Error(
      "Montant invalide"
    );

  }



  const ref =
  adminDB.ref(
    `users/${uid}/balance`
  );



  let oldBalance = 0;

  let newBalance = 0;

  let success = false;



  await ref.transaction(

    (current:any)=>{


      oldBalance =
      Number(current ?? 0);



      if(oldBalance < amount){

        return current;

      }



      newBalance =
      oldBalance - amount;


      success = true;


      return newBalance;


    }

  );



  if(!success){

    throw new Error(
      "Solde insuffisant"
    );

  }




  await adminDB
  .ref(
    `transactions/${uid}`
  )
  .push({

    type:"bet",

    amount:-amount,

    gameId,

    oldBalance,

    newBalance,

    status:"completed",

    createdAt:Date.now()

  });




  return {

    oldBalance,

    newBalance

  };


}




// ===============================
// AJOUTER UN SOLDE
// ===============================

export async function addBalance(

  uid:string,

  amount:number,

  type:string="reward",

  gameId?:string

){


  if(amount <= 0){

    throw new Error(
      "Montant invalide"
    );

  }



  const ref =
  adminDB.ref(
    `users/${uid}/balance`
  );



  let oldBalance = 0;

  let newBalance = 0;



  await ref.transaction(

    (current:any)=>{


      oldBalance =
      Number(current ?? 0);



      newBalance =
      oldBalance + amount;



      return newBalance;


    }

  );






  await adminDB
  .ref(
    `transactions/${uid}`
  )
  .push({

    type,

    amount,

    gameId:gameId || null,

    oldBalance,

    newBalance,

    status:"completed",

    createdAt:Date.now()

  });





  await adminDB
  .ref(
    `users/${uid}`
  )
  .update({

    balanceUpdatedAt:
    Date.now()

  });





  return {

    oldBalance,

    newBalance

  };


}





// ===============================
// PAYER LE GAGNANT
// ===============================

export async function payWinner(

  uid:string,

  amount:number,

  gameId:string

){


  return await addBalance(

    uid,

    amount,

    "game_reward",

    gameId

  );


}
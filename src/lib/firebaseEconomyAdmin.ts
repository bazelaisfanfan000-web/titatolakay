import {
  adminDB
} from "@/lib/firebaseAdmin";


// ===============================
// VERIFICATION DATABASE
// ===============================

function checkDatabase(){

  if(!adminDB){

    throw new Error(
      "Firebase Database non initialisée"
    );

  }

}



// ===============================
// LIRE LE SOLDE
// ===============================

export async function checkUserBalance(
  uid:string
){

  checkDatabase();


  const balanceRef =
    adminDB.ref(
      `users/${uid}/balance`
    );


  const snapshot =
    await balanceRef.get();



  if(!snapshot.exists()){

    console.log(
      "[ECONOMY] NO BALANCE",
      uid
    );

    return 0;

  }


  return Number(
    snapshot.val() || 0
  );

}




// ===============================
// DEBITER UNE MISE
// ===============================

export async function deductBet(

  uid:string,

  amount:number,

  reason:string="game"

){

  checkDatabase();



  if(amount <= 0){

    throw new Error(
      "Montant invalide"
    );

  }



  const balanceRef =
    adminDB.ref(
      `users/${uid}/balance`
    );



  let oldBalance = 0;

  let newBalance = 0;

  let success = false;



  await balanceRef.transaction(

    (current:any)=>{


      oldBalance =
        Number(
          current ?? 0
        );


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

      reason,

      amount:-amount,

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

  checkDatabase();



  if(amount <= 0){

    throw new Error(
      "Montant invalide"
    );

  }



  const balanceRef =
    adminDB.ref(
      `users/${uid}/balance`
    );



  let oldBalance = 0;

  let newBalance = 0;



  await balanceRef.transaction(

    (current:any)=>{


      oldBalance =
        Number(
          current ?? 0
        );


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



  console.log(
    "[ECONOMY] ADD BALANCE",
    {
      uid,
      amount,
      oldBalance,
      newBalance,
      type
    }
  );



  return {

    oldBalance,

    newBalance

  };

}
import {
  adminDB
} from "@/lib/firebaseAdmin";




// ===============================
// LIRE LE SOLDE
// ===============================

export async function checkUserBalance(
  uid:string
){

const balanceRef =
adminDB.ref(
`users/${uid}/balance`
);


const snapshot =
await balanceRef.get();



if(!snapshot.exists()){

  console.log("CREATE BALANCE", { uid });

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

(current)=>{


oldBalance =
Number(current ?? 0);



console.log(
    "BET DEBIT",
    {
      uid,
      current,
      oldBalance,
      amount
    }
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

  type: "bet",
  amount: -amount,
  oldBalance,
  newBalance,
  gameId: null,
  status: "completed",
  createdAt: Date.now()
});

console.log("BET DEBIT", { uid, oldBalance, newBalance });





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
// AJOUTER UN SOLDE (GAIN)
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




const balanceRef =
adminDB.ref(
`users/${uid}/balance`
);



let oldBalance = 0;

let newBalance = 0;




await balanceRef.transaction(

(current)=>{


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
  gameId: gameId || null,
  oldBalance,
  newBalance,
  status: "completed",
  createdAt: Date.now()

});

if(oldBalance === 0){
  console.log("CREATE BALANCE", { uid, oldBalance, newBalance });
}






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
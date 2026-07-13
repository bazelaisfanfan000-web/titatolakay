import {
 ref,
 get,
 update,
 push,
 set
} from "firebase/database";


import {
 database
} from "@/lib/firebase";



export async function payWinner(

winnerId:string,

bet:number

){



const pot = bet * 2;


const fee = pot * 0.10;


const reward = pot - fee;



const userRef = ref(
 database,
 `users/${winnerId}`
);



const snapshot = await get(userRef);



if(!snapshot.exists()){

throw new Error(
"Utilisateur introuvable"
);

}



const user = snapshot.val();



await update(userRef,{

balance:
(user.balance || 0)
+
reward

});



// Historique transaction

const transactionRef =
push(
 ref(database,"transactions")
);



await set(
transactionRef,
{

userId:winnerId,

type:"GAME_WIN",

amount:reward,

createdAt:
Date.now()

}

);



return {

reward,

fee

};


}
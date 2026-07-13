import {
  ref,
  get,
  update
} from "firebase/database";

import {
 database
} from "@/lib/firebase";


export async function lockBet(
 userId:string,
 amount:number
){


const userRef = ref(
 database,
 `users/${userId}`
);


const snapshot = await get(userRef);



if(!snapshot.exists()){

 throw new Error(
 "Utilisateur introuvable"
 );

}



const user = snapshot.val();



if(user.balance < amount){

 throw new Error(
 "Solde insuffisant"
 );

}



await update(userRef,{

 balance:
 user.balance - amount,

 lockedBalance:
 (user.lockedBalance || 0)
 + amount

});



return true;


}
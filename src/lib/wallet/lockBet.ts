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


const balance = Number(user.balance || 0);
const reservedBalance = Number(user.reservedBalance || 0);
const available = balance - reservedBalance;


if(available < amount){

 throw new Error(
 "Solde insuffisant"
 );

}



await update(userRef,{

 reservedBalance:
 (user.reservedBalance || 0)
 + amount

});



return true;


}
/**
 * Système Wallet HTG sécurisé
 * Utilise users/${uid}/balance
 */

import {
  adminDB
} from "./firebaseAdmin";


export interface Wallet {

  balance:number;

  locked:number;

  createdAt:number;

  updatedAt:number;

}



export interface Transaction {

  id:string;

  uid:string;

  type:
  | "deposit"
  | "withdrawal"
  | "bet"
  | "reward"
  | "refund";

  amount:number;

  status:
  | "pending"
  | "completed"
  | "failed";

  description?:string;

  metadata?:{

    gameId?:string;

    roomId?:string;

    reference?:string;

  };

  createdAt:number;

  completedAt?:number;

}





/**
 * Créer un wallet seulement si absent
 */
export async function createWallet(
uid:string
):Promise<Wallet>{


const userRef =
adminDB.ref(`users/${uid}`);



const snap =
await userRef.once("value");



if(snap.exists()){


const data =
snap.val();


return {

balance:Number(data.balance || 0),

locked:Number(data.locked || 0),

createdAt:data.createdAt || Date.now(),

updatedAt:data.updatedAt || Date.now()

};


}





const wallet:Wallet={


balance:1000,

locked:0,

createdAt:Date.now(),

updatedAt:Date.now()


};



await userRef.set(wallet);



return wallet;


}







/**
 * Lire le wallet
 */
export async function getWallet(
uid:string
):Promise<Wallet|null>{



const ref =
adminDB.ref(`users/${uid}`);



const snap =
await ref.once("value");



if(!snap.exists()){

return null;

}



const data =
snap.val();



return {


balance:Number(data.balance || 0),


locked:Number(data.locked || 0),


createdAt:data.createdAt || Date.now(),


updatedAt:data.updatedAt || Date.now()


};



}








/**
 * Solde disponible
 */
export async function getAvailableBalance(
uid:string
):Promise<number>{


const wallet =
await getWallet(uid);



if(!wallet){

return 0;

}



return wallet.balance - wallet.locked;


}









/**
 * Vérifier solde
 */
export async function hasAvailableBalance(
uid:string,
amount:number
){


const balance =
await getAvailableBalance(uid);



return balance >= amount;


}









/**
 * Bloquer une mise
 */
export async function lockBalance(
uid:string,
amount:number,
gameId:string
){


const ref =
adminDB.ref(`users/${uid}`);



const result =
await ref.transaction(
(current:any)=>{


if(!current){

return null;

}



const available =
Number(current.balance || 0)
-
Number(current.locked || 0);



if(available < amount){

return;

}



return {


...current,


locked:
Number(current.locked || 0)
+
amount,


updatedAt:Date.now()


};



}

);



return result.committed;


}









/**
 * Ajouter argent
 */
export async function creditWallet(
uid:string,
amount:number,
type:
"deposit"
|"reward"
|"refund",
description?:string,
metadata?:any
){



const ref =
adminDB.ref(`users/${uid}`);



const result =
await ref.transaction(
(current:any)=>{


if(!current){

return {

balance:amount,

locked:0,

createdAt:Date.now(),

updatedAt:Date.now()

};


}



return {


...current,


balance:
Number(current.balance || 0)
+
amount,


updatedAt:Date.now()


};



}

);



if(!result.committed){

return false;

}




const transactionRef =
adminDB
.ref(`transactions/${uid}`)
.push();



await transactionRef.set({


id:transactionRef.key,

uid,

type,

amount,

status:"completed",

description,

metadata,

createdAt:Date.now(),

completedAt:Date.now()


});



return true;


}









/**
 * Retirer argent
 */
export async function debitWallet(
uid:string,
amount:number,
description?:string,
metadata?:any
){


const ref =
adminDB.ref(`users/${uid}`);



const result =
await ref.transaction(
(current:any)=>{


if(!current){

return;

}



const balance =
Number(current.balance || 0);



const locked =
Number(current.locked || 0);



if(balance - locked < amount){

return;

}



return {


...current,


balance:
balance - amount,


updatedAt:Date.now()


};



}

);



return result.committed;


}









/**
 * Historique transactions
 */
export async function getTransactions(
uid:string,
limit:number=50
){


const ref =
adminDB
.ref(`transactions/${uid}`)
.orderByChild("createdAt")
.limitToLast(limit);



const snap =
await ref.once("value");



const list:any[]=[];



snap.forEach((child: any)=>{


list.push(child.val());


});



return list.reverse();


}
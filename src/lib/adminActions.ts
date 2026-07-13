import {
  rtdb
} from "@/lib/firebase";

import {
  ref,
  get,
  update,
  push,
  set
} from "firebase/database";



export async function giveMoney(
  uid:string,
  amount:number
){


const walletRef = ref(
  rtdb,
  `wallets/${uid}`
);



const snap = await get(walletRef);



const oldBalance =
snap.val()?.balance || 0;



await update(

walletRef,

{

balance:
oldBalance + amount

}

);




// historique transaction

const transactionRef =
push(
  ref(rtdb,"transactions")
);



await set(

transactionRef,

{

uid,

amount,

type:"admin_gift",

createdAt:Date.now()

}

);




// notification joueur

const notificationRef =
push(

ref(
rtdb,
`notifications/${uid}`
)

);



await set(

notificationRef,

{

title:"🎁 Cadeau reçu",

message:
`Vous avez reçu ${amount} HTG de l'administration`,

read:false,

date:Date.now()

}

);



}
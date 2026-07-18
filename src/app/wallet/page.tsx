"use client";

import {
useEffect,
useState
} from "react";


import {
auth
} from "@/lib/firebase";


import {
onAuthStateChanged
} from "firebase/auth";


import TchotchomDepositButton from "@/components/TchotchomDepositButton";

import TchotchomWithdrawButton from "@/components/TchotchomWithdrawButton";



export default function WalletPage(){


const [balance,setBalance] =
useState(0);


const [uid,setUid] =
useState("");



useEffect(()=>{


const unsub =
onAuthStateChanged(
auth,
(user)=>{


if(user){

setUid(
user.uid
);

}


});


return ()=>unsub();


},[]);






return (

<div
className="
min-h-screen
bg-black
text-white
p-6
"
>


<div
className="
max-w-md
mx-auto
"
>


<h1
className="
text-3xl
font-bold
mb-6
"
>
💰 Mon Wallet
</h1>





<div
className="
bg-zinc-900
rounded-3xl
p-6
border
border-zinc-800
"
>


<p
className="
text-gray-400
"
>
Solde disponible
</p>



<h2
className="
text-4xl
font-bold
mt-2
"
>
{balance} HTG
</h2>



</div>






<div
className="
grid
gap-4
mt-6
"
>


<TchotchomDepositButton />



<TchotchomWithdrawButton />



</div>




</div>


</div>


);


}
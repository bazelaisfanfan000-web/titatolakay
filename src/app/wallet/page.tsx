"use client";

import {
  useEffect,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  auth,
  database
} from "@/lib/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  ref,
  onValue
} from "firebase/database";

import {
  useBalance
} from "@/hooks/useBalance";



export default function WalletPage(){


const router = useRouter();



const {
balance,
loading:balanceLoading
}=useBalance();



const [
username,
setUsername
]=useState("Joueur");


const [
uid,
setUid
]=useState("");


const [
loading,
setLoading
]=useState(true);


const [
message,
setMessage
]=useState("");


const [
showDeposit,
setShowDeposit
]=useState(false);


const [
showWithdraw,
setShowWithdraw
]=useState(false);


const [
amount,
setAmount
]=useState("");


const [
moncashNumber,
setMoncashNumber
]=useState("");





useEffect(()=>{


const unsub =

onAuthStateChanged(

auth,

(user)=>{


if(!user){

router.push("/login");

return;

}



setUid(user.uid);



const userRef =

ref(
database,
`users/${user.uid}`
);



return onValue(

userRef,

snap=>{


const data =
snap.val();



if(data){

setUsername(
data.username || "Joueur"
);

}



setLoading(false);


}

);



}

);



return()=>unsub();


},[router]);







async function deposit(){


if(!amount){

return setMessage(
"Montant requis"
);

}



try{


const res =

await fetch(

"/api/wallet/deposit",

{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

uid,

amount:Number(amount),

username

})

}

);



const data =
await res.json();



if(!res.ok){

throw new Error(
data.error
);

}



window.location.href =
data.paymentUrl;



}catch(e:any){

setMessage(
e.message
);

}


}







async function withdraw(){


if(
!amount ||
!moncashNumber
){

return setMessage(
"Numéro et montant obligatoires"
);

}



try{


const res =

await fetch(

"/api/wallet/withdraw",

{

method:"POST",

headers:{

"Content-Type":
"application/json"

},

body:JSON.stringify({

uid,

amount:Number(amount),

moncashNumber

})

}

);



const data =
await res.json();



if(!res.ok){

throw new Error(
data.error
);

}



setMessage(

"✅ Retrait envoyé vers MonCash"

);


setShowWithdraw(false);

setAmount("");

setMoncashNumber("");



}catch(e:any){

setMessage(
e.message
);

}


}






if(
loading ||
balanceLoading
){

return(

<main className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
">

Chargement...

</main>

);

}





return(<main className="
min-h-screen
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
px-4
py-10
">


<div className="
max-w-sm
mx-auto
">


<button
onClick={()=>router.back()}
className="
text-gray-300
mb-6
"
>
← Retour
</button>





<h1 className="
text-center
text-2xl
font-black
mb-6
text-cyan-300
">

💼 Portefeuille

</h1>






<section className="
bg-white/10
border
border-white/20
rounded-3xl
p-6
text-center
">


<p>
💰 Solde disponible
</p>


<h2 className="
text-4xl
font-black
text-green-400
mt-3
">

{Math.floor(balance)} HTG

</h2>



<p className="text-gray-400 mt-3">

Compte : {username}

</p>


</section>







<section className="
mt-5
bg-white/10
border
border-white/20
rounded-3xl
p-5
">


<h2 className="font-bold mb-4">

💳 Actions

</h2>





<button

onClick={()=>setShowDeposit(true)}

className="
w-full
py-3
rounded-xl
font-black
bg-gradient-to-b
from-cyan-300
via-blue-500
to-blue-800
border
border-blue-300/50
shadow-[0_7px_0_#082f75,0_12px_25px_rgba(0,0,0,0.5)]
hover:translate-y-[-2px]
active:translate-y-[4px]
active:shadow-[0_2px_0_#082f75]
transition-all
duration-150
mb-3
"

>

➕ Déposer MonCash

</button>







<button

onClick={()=>setShowWithdraw(true)}

className="
w-full
py-3
rounded-xl
font-black
bg-gradient-to-b
from-purple-300
via-purple-500
to-purple-800
border
border-purple-300/50
shadow-[0_7px_0_#4c1d95,0_12px_25px_rgba(0,0,0,0.5)]
hover:translate-y-[-2px]
active:translate-y-[4px]
active:shadow-[0_2px_0_#4c1d95]
transition-all
duration-150
"

>

💸 Retirer MonCash

</button>


</section>







{
(showDeposit || showWithdraw) &&


<section className="
mt-5
bg-black/40
border
border-white/20
rounded-3xl
p-5
">


<h2 className="font-bold mb-4">

{
showDeposit
?
"➕ Dépôt MonCash"
:
"💸 Retrait MonCash"
}

</h2>





{
showWithdraw &&

<input

value={moncashNumber}

onChange={
e=>setMoncashNumber(e.target.value)
}

placeholder="509XXXXXXXX"

className="
w-full
mb-3
p-3
rounded-xl
bg-white/10
border
border-white/20
"

/>

}





<input

value={amount}

onChange={
e=>setAmount(e.target.value)
}

placeholder="Montant HTG"

type="number"

className="
w-full
mb-3
p-3
rounded-xl
bg-white/10
border
border-white/20
"

/>







<button

onClick={
showDeposit
?
deposit
:
withdraw
}

className="
w-full
py-3
rounded-xl
font-black
bg-gradient-to-b
from-green-300
via-green-500
to-green-800
border
border-green-300/50
shadow-[0_7px_0_#166534,0_12px_25px_rgba(0,0,0,0.5)]
hover:translate-y-[-2px]
active:translate-y-[4px]
active:shadow-[0_2px_0_#166534]
transition-all
duration-150
"

>

Confirmer

</button>







<button

onClick={()=>{

setShowDeposit(false);

setShowWithdraw(false);

}}

className="
w-full
mt-3
py-3
rounded-xl
font-bold
bg-gradient-to-b
from-gray-300
to-gray-700
shadow-[0_5px_0_#111827]
active:translate-y-[3px]
active:shadow-[0_2px_0_#111827]
transition-all
duration-150
"

>

Annuler

</button>



</section>

}







{
message &&

<div className="
fixed
bottom-10
left-1/2
-translate-x-1/2
bg-[#07152f]
border
border-white/20
rounded-2xl
p-5
w-[90%]
text-center
">


{message}



<button

onClick={()=>setMessage("")}

className="
block
mx-auto
mt-3
text-cyan-400
"

>

Fermer

</button>


</div>

}



</div>


</main>


);


}
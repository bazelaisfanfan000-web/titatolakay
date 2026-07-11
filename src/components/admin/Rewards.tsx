"use client";


import {
useEffect,
useState
} from "react";


import {
database
} from "@/lib/firebase";


import {
ref,
onValue,
get,
set,
push
} from "firebase/database";







export default function Rewards(){



const [users,setUsers]=useState<any[]>([]);


const [amount,setAmount]=useState("");

const [preview,setPreview]=useState(false);

const [sending,setSending]=useState(false);








useEffect(()=>{


const usersRef =
ref(database,"users");



return onValue(

usersRef,

(snapshot)=>{


const data =
snapshot.val() || {};



const list:any[]=[];



Object.entries(data).forEach(

([uid,user]:any)=>{


if(
user.role !== "admin"
&&
user.banned !== true
){



list.push({

uid,

username:
user.username || "Joueur",

balance:
Number(user.balance || 0)

});


}



}


);



setUsers(list);



}


);



},[]);










const bonus =
Number(amount || 0);



const total =
bonus * users.length;









async function sendReward(){



if(
bonus <=0
||
users.length===0
){

return;

}



setSending(true);



try{





for(const user of users){



const balanceRef =
ref(
database,
`users/${user.uid}/balance`
);



const snap =
await get(balanceRef);



const oldBalance =
Number(
snap.val() || 0
);






await set(

balanceRef,

oldBalance + bonus

);







const notifRef =
push(

ref(
database,
`notifications/${user.uid}`
)

);







await set(

notifRef,

{

message:

`🎁 Ti Ta To vous offre un bonus de ${bonus} HTG`,

amount:bonus,

read:false,

createdAt:Date.now()

}

);





}







alert(
`✅ ${total} HTG distribués à ${users.length} joueurs`
);



setAmount("");

setPreview(false);



}

catch(error){


console.log(error);


alert(
"Erreur pendant la distribution"
);



}



setSending(false);



}









return(


<div className="
text-white
w-full
">






<h1 className="
text-2xl
font-black
">

🎁 Récompenses

</h1>




<p className="
text-sm
text-gray-400
">

Distribuer un bonus aux joueurs actifs

</p>









<div className="
mt-5
bg-white/[0.05]
border
border-white/10
rounded-2xl
p-5
">





<p className="
text-sm
text-gray-400
">

👥 Joueurs concernés

</p>



<h2 className="
text-3xl
font-black
mt-2
">

{users.length}

</h2>




</div>









<div className="
mt-4
bg-white/[0.05]
border
border-white/10
rounded-2xl
p-5
">





<label className="
text-sm
text-gray-400
">

💰 Bonus par joueur (HTG)

</label>




<input


type="number"


value={amount}


onChange={
e=>setAmount(e.target.value)
}


placeholder="Exemple : 1000"


className="
mt-3
w-full
bg-black/40
border
border-white/10
rounded-xl
p-4
"

/>






</div>









<div className="
mt-4
bg-green-600/20
border
border-green-500/20
rounded-2xl
p-5
">



<p className="
text-sm
text-gray-300
">

💰 Total à distribuer

</p>



<h2 className="
text-3xl
font-black
text-green-400
mt-2
">

{total} HTG

</h2>



</div>









<button


onClick={()=>setPreview(true)}


disabled={!bonus}


className="
mt-5
w-full
bg-blue-600
hover:bg-blue-700
py-3
rounded-xl
font-bold
"

>


🎁 Préparer récompense


</button>









{

preview &&


<div className="
fixed
inset-0
bg-black/70
flex
items-center
justify-center
z-50
">



<div className="
bg-[#090909]
border
border-white/10
rounded-3xl
p-6
w-96
">



<h2 className="
text-xl
font-black
">

🎁 Confirmation

</h2>




<div className="
mt-4
space-y-2
text-sm
">



<p>

👥 Joueurs :
<b>{users.length}</b>

</p>



<p>

💰 Bonus chacun :
<b>{bonus} HTG</b>

</p>



<p>

🏦 Total :
<b>{total} HTG</b>

</p>



</div>








<div className="
flex
gap-3
mt-6
">



<button

onClick={()=>
setPreview(false)
}

className="
bg-gray-700
flex-1
py-3
rounded-xl
"

>

Annuler

</button>







<button

disabled={sending}

onClick={sendReward}

className="
bg-green-600
flex-1
py-3
rounded-xl
font-bold
"

>

{

sending
?
"Envoi..."
:
"Confirmer"

}

</button>




</div>







</div>



</div>



}








</div>


);



}
"use client";


import {
  useEffect,
  useState
} from "react";


import {
  ref,
  onValue,
  update
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





export default function AdminRewardsPage(){


const [users,setUsers] =
useState<any[]>([]);


const [amount,setAmount] =
useState(10);


const [message,setMessage] =
useState(
"🎁 Récompense Domino Lakay"
);



const [loading,setLoading] =
useState(false);






useEffect(()=>{


const usersRef =
ref(
database,
"users"
);



const unsubscribe =
onValue(

usersRef,

(snapshot)=>{


const data =
snapshot.val() || {};



const list =

Object.entries(data)
.map(([uid,user]:any)=>({

uid,

...user

}));


setUsers(list);



}



);



return()=>unsubscribe();



},[]);








const totalCost =

users.length *

Number(amount || 0);









async function giveReward(){



if(!amount)
return;



const confirmReward =
confirm(

`Donner ${amount} HTG à ${users.length} joueurs ?

Coût total : ${totalCost} HTG`

);



if(!confirmReward)
return;





setLoading(true);





const updates:any = {};





users.forEach((user)=>{



const oldBalance =

Number(
user.balance || 0
);





updates[

`users/${user.uid}/balance`

]
=

oldBalance + Number(amount);







const notificationId =
Date.now().toString()
+
Math.random();





updates[

`notifications/${user.uid}/${notificationId}`

]
=

{


title:"🎁 Récompense",

message,


read:false,


createdAt:Date.now()


};





});






await update(

ref(database),

updates

);





setLoading(false);





alert(
"✅ Récompense envoyée à tous les joueurs"
);



}










return(


<div>


<h1 className="
text-3xl
font-black
">

🎁 Récompenses globales

</h1>



<p className="
text-gray-400
mt-2
">

Envoyer un bonus à tous les utilisateurs

</p>








<div className="
mt-8
bg-white/5
border
border-white/10
rounded-3xl
p-6
">



<div className="
space-y-5
">



<div>

<label>
Montant HTG par joueur
</label>


<input

type="number"

value={amount}

onChange={(e)=>
setAmount(
Number(e.target.value)
)
}

className="
mt-2
w-full
bg-black
border
border-white/20
rounded-xl
p-3
"

/>

</div>






<div>

<label>
Message notification
</label>


<input

value={message}

onChange={(e)=>
setMessage(e.target.value)
}

className="
mt-2
w-full
bg-black
border
border-white/20
rounded-xl
p-3
"

/>

</div>






<div className="
bg-black/30
rounded-xl
p-4
">


<p>
👥 Joueurs :
<b>
{" "}
{users.length}
</b>
</p>



<p>
💰 Coût total :
<b>
{" "}
{totalCost} HTG
</b>
</p>


</div>






<button

onClick={giveReward}

disabled={loading}

className="
w-full
bg-green-600
py-3
rounded-xl
font-bold
"

>


{

loading ?

"⏳ Envoi..."

:

"🎁 Envoyer récompense"

}



</button>





</div>





</div>





</div>


);


}
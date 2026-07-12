"use client";


import {
  useEffect,
  useState
} from "react";


import {
  ref,
  onValue,
  update,
  push,
  set
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





export default function Rewards(){



const [users,setUsers] =
useState<any[]>([]);


const [rewards,setRewards] =
useState<any[]>([]);



const [selectedUser,setSelectedUser] =
useState("");

const [amount,setAmount] =
useState("");

const [type,setType] =
useState("bonus");

const [reason,setReason] =
useState("");








useEffect(()=>{


const usersRef =
ref(database,"users");


const rewardsRef =
ref(database,"rewards");






const stopUsers =
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






const stopRewards =
onValue(

rewardsRef,

(snapshot)=>{


const data =
snapshot.val() || {};


const list =

Object.entries(data)

.map(([id,reward]:any)=>({

id,

...reward

}));



setRewards(list);



}


);







return()=>{

stopUsers();

stopRewards();

};


},[]);









async function giveReward(){



if(
!selectedUser ||
!amount
){

alert(
"Informations manquantes"
);

return;

}





const value =
Number(amount);



const userRef =
ref(
database,
`users/${selectedUser}`
);



const rewardRef =
push(
ref(database,"rewards")
);






await update(

userRef,

{

balance:
(value || 0)

}

);






await set(

rewardRef,

{

uid:selectedUser,

amount:value,

type,

reason,

createdAt:Date.now()

}

);





alert(
"🎁 Récompense ajoutée"
);



setAmount("");

setReason("");

}









return(


<div className="text-white">






<h1 className="
text-3xl
font-black
">

🎁 Récompenses joueurs

</h1>



<p className="
text-gray-400
mt-2
">

Bonus, cashback et récompenses DOMINOS HAÏTI

</p>









<div className="
mt-8
grid
md:grid-cols-2
gap-5
">







{/* CREATION */}



<div className="

bg-[#111827]

border

border-white/10

rounded-3xl

p-6

">


<h2 className="
text-xl
font-black
">

➕ Donner une récompense

</h2>






<select

value={selectedUser}

onChange={(e)=>
setSelectedUser(e.target.value)
}


className="
mt-5
w-full
bg-black
border
border-white/20
rounded-xl
p-4
"

>


<option value="">

Choisir un joueur

</option>



{

users.map(user=>(


<option

key={user.uid}

value={user.uid}

>

{
user.username || "Joueur"
}

</option>



))


}



</select>









<select


value={type}


onChange={(e)=>
setType(e.target.value)
}


className="
mt-4
w-full
bg-black
border
border-white/20
rounded-xl
p-4
"

>


<option value="bonus">
🎁 Bonus
</option>


<option value="cashback">
💰 Cashback
</option>


<option value="reward">
🏆 Récompense
</option>


</select>








<input

value={amount}

onChange={(e)=>
setAmount(e.target.value)
}


placeholder="Montant HTG"


className="
mt-4
w-full
bg-black
border
border-white/20
rounded-xl
p-4
"

/>







<input

value={reason}

onChange={(e)=>
setReason(e.target.value)
}


placeholder="Raison"


className="
mt-4
w-full
bg-black
border
border-white/20
rounded-xl
p-4
"

/>









<button

onClick={giveReward}


className="

mt-5

w-full

bg-blue-600

py-4

rounded-xl

font-black

border-b-4

border-blue-900

shadow-[0_6px_0_#172554]

hover:bg-blue-500

active:translate-y-1

active:border-b-0

transition-all

"


>


🎁 Envoyer récompense


</button>






</div>










{/* HISTORIQUE */}



<div className="

bg-[#111827]

border

border-white/10

rounded-3xl

p-6

">


<h2 className="
text-xl
font-black
">

📜 Historique

</h2>







<div className="
mt-5
space-y-4
">





{

rewards.length===0 &&


<p className="
text-gray-400
">

Aucune récompense

</p>


}







{

rewards.map((reward)=>(



<div

key={reward.id}

className="
bg-black/30
rounded-xl
p-4
"


>


<p>

🎁

{

reward.type

}

</p>


<p className="
text-green-400
font-bold
">

+ {reward.amount} HTG

</p>


<p className="
text-gray-400
text-sm
">

{reward.reason}

</p>



</div>



))


}





</div>





</div>







</div>








</div>


);



}
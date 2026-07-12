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





export default function Users(){


const [users,setUsers] =
useState<any[]>([]);


const [search,setSearch] =
useState("");


const [selectedUser,setSelectedUser] =
useState<any>(null);


const [newBalance,setNewBalance] =
useState("");





useEffect(()=>{


const usersRef =
ref(database,"users");



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








async function updateBalance(){



if(!selectedUser)
return;



const amount =
Number(newBalance);



if(
isNaN(amount)
||
amount < 0
){


alert("❌ Solde invalide");

return;


}




await update(

ref(
database,
`users/${selectedUser.uid}`
),

{

balance:amount,

balanceUpdatedAt:Date.now()

}

);



alert("✅ Solde modifié");


setSelectedUser(null);

setNewBalance("");



}








async function banUser(uid:string){



const reason =
prompt(
"Raison du bannissement"
);



if(!reason)
return;




await update(

ref(
database,
`users/${uid}`
),

{

banned:true,

banReason:reason,

bannedAt:Date.now()

}

);



alert("🚫 Joueur banni");



}








const filteredUsers =

users.filter((user)=>{


const value =

`${user.username || ""}
${user.email || ""}
${user.uid}`

.toLowerCase();



return value.includes(
search.toLowerCase()
);



});








return(


<div className="
text-white
">


<h1 className="
text-3xl
font-black
">

👥 Gestion utilisateurs

</h1>



<p className="
text-gray-400
mt-2
">

Gestion des comptes joueurs DOMINOS HAÏTI

</p>





<div className="
mt-8
">


<input


value={search}


onChange={(e)=>
setSearch(e.target.value)
}


placeholder="🔍 Rechercher un joueur..."


className="
w-full
bg-black
border
border-white/20
rounded-xl
p-4
outline-none
"


/>


</div>





<div className="
mt-8
space-y-5
">


{
filteredUsers.length===0 &&

<div className="
bg-white/5
border
border-white/10
rounded-3xl
p-6
text-gray-400
">

Aucun utilisateur trouvé

</div>

}






{
filteredUsers.map((user)=>(


<div

key={user.uid}

className="
bg-[#111827]
border
border-white/10
rounded-3xl
p-6
shadow-xl
"

><div className="
flex
justify-between
items-center
">


<h2 className="
text-xl
font-black
">

👤 {user.username || "Joueur"}

</h2>




{
user.banned ?

<span className="
bg-red-500/20
text-red-400
px-3
py-1
rounded-full
text-sm
font-bold
">

BANNI

</span>


:


<span className="
bg-green-500/20
text-green-400
px-3
py-1
rounded-full
text-sm
font-bold
">

ACTIF

</span>

}


</div>








<div className="
mt-5
grid
md:grid-cols-2
gap-3
">





<div className="
bg-black/30
rounded-xl
p-4
">

📧 Email


<p className="
text-white
mt-1
">

{
user.email || "Non disponible"
}

</p>


</div>









<div className="
bg-black/30
rounded-xl
p-4
">


<div className="
flex
justify-between
items-center
">


<span>
💰 Solde
</span>



<button


onClick={()=>{

setSelectedUser(user);

setNewBalance(
String(user.balance || 0)
);

}}


className="
bg-blue-600
px-3
py-1
rounded-lg
text-xs
font-bold
hover:bg-blue-500
"

>

✏️ Modifier

</button>



</div>




<p className="
text-green-400
font-bold
mt-3
">


{
user.balance || 0
}

 HTG


</p>


</div>









<div className="
bg-black/30
rounded-xl
p-4
">

🆔 UID


<p className="
text-gray-300
text-xs
break-all
mt-1
">

{user.uid}

</p>


</div>








<div className="
bg-black/30
rounded-xl
p-4
">

📅 Création


<p className="
text-white
mt-1
">


{

user.createdAt

?

new Date(
user.createdAt
)
.toLocaleDateString()

:

"Non disponible"

}



</p>


</div>






</div>








{

!user.banned &&


<button


onClick={()=>
banUser(user.uid)
}


className="
mt-6
w-full
bg-red-600
text-white
py-4
rounded-xl
font-black
border-b-4
border-red-900
shadow-[0_6px_0_#7f1d1d]
hover:bg-red-500
active:translate-y-1
active:border-b-0
transition-all
"

>


🚫 Bannir ce joueur


</button>



}



</div>


))


}



</div>{


selectedUser && (


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
bg-[#111827]
border
border-white/10
rounded-3xl
p-8
w-[90%]
max-w-md
shadow-2xl
">



<h2 className="
text-2xl
font-black
">

💰 Modifier le solde

</h2>



<p className="
text-gray-400
mt-2
">

Joueur :

<span className="
text-white
font-bold
">

 {selectedUser.username || "Joueur"}

</span>

</p>





<input


type="number"


value={newBalance}


onChange={(e)=>
setNewBalance(e.target.value)
}


placeholder="Nouveau solde HTG"


className="
mt-6
w-full
bg-black
border
border-white/20
rounded-xl
p-4
outline-none
"


/>







<div className="
flex
gap-3
mt-6
">





<button


onClick={updateBalance}


className="
flex-1
bg-green-600
py-3
rounded-xl
font-bold
hover:bg-green-500
"

>

✅ Valider

</button>







<button


onClick={()=>{


setSelectedUser(null);

setNewBalance("");

}}


className="
flex-1
bg-red-600
py-3
rounded-xl
font-bold
hover:bg-red-500
"


>

❌ Annuler

</button>





</div>





</div>


</div>


)


}



</div>


);


}
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



export default function Banned(){



const [users,setUsers] =
useState<any[]>([]);





useEffect(()=>{


const usersRef =
ref(database,"users");



const unsubscribe =
onValue(

usersRef,

(snapshot)=>{


const data =
snapshot.val() || {};



const bannedUsers =

Object.entries(data)

.map(([uid,user]:any)=>({

uid,

...user

}))

.filter(
(user:any)=>
user.banned === true
);



setUsers(bannedUsers);



}


);



return()=>unsubscribe();



},[]);








async function unban(uid:string){


await update(

ref(
database,
`users/${uid}`
),

{

banned:false,

banReason:null,

bannedAt:null

}

);



alert(
"✅ Joueur débanni"
);



}







return(


<div className="text-white">





<h1 className="
text-3xl
font-black
">

🚫 Utilisateurs bannis

</h1>



<p className="
text-gray-400
mt-2
">

Gestion des comptes bloqués

</p>








<div className="
mt-8
space-y-5
">






{
users.length === 0 &&


<div className="

bg-green-500/10

border

border-green-500/20

rounded-3xl

p-6

text-green-400

font-bold

">


✅ Aucun utilisateur banni


</div>


}








{

users.map((user)=>(



<div

key={user.uid}

className="

bg-[#111827]

border

border-red-500/20

rounded-3xl

p-6

shadow-xl

"


>





<div className="
flex
justify-between
items-center
">


<h2 className="
text-xl
font-black
">

🚫 {user.username || "Joueur"}

</h2>



<div className="
bg-red-500/20
text-red-400
px-3
py-1
rounded-full
text-sm
font-bold
">

BANNI

</div>



</div>







<div className="
mt-5
space-y-3
text-gray-300
text-sm
">



<div className="
bg-black/30
rounded-xl
p-3
">

🆔 UID :

<span className="text-white">

{user.uid}

</span>

</div>






<div className="
bg-black/30
rounded-xl
p-3
">

📧 Email :

<span className="text-white">

{user.email || "Non disponible"}

</span>

</div>






<div className="
bg-black/30
rounded-xl
p-3
">

📝 Raison :

<span className="text-white">

{user.banReason || "Aucune"}

</span>

</div>







<div className="
bg-black/30
rounded-xl
p-3
">

📅 Date :

<span className="text-white">

{

user.bannedAt

?

new Date(
user.bannedAt
)
.toLocaleString()

:

"Non disponible"

}


</span>

</div>




</div>









<button


onClick={()=>unban(user.uid)}


className="

mt-6

w-full

bg-blue-600

text-white

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


🔓 Débannir le joueur


</button>








</div>



))


}





</div>






</div>


);



}
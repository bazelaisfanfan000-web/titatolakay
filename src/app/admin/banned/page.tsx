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





export default function AdminBannedPage(){



const [users,setUsers] =
useState<any[]>([]);






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


<div>


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

Liste des comptes bloqués

</p>








<div className="
mt-8
space-y-5
">





{

users.length===0 &&


<div className="
bg-white/5
border
border-white/10
rounded-2xl
p-5
">

✅ Aucun utilisateur banni

</div>



}








{

users.map((user)=>(



<div

key={user.uid}

className="
bg-white/5
backdrop-blur-xl
border
border-white/10
rounded-3xl
p-6
"

>



<h2 className="
font-bold
text-xl
">

🚫 {user.username || "Joueur"}

</h2>







<div className="
mt-4
space-y-2
text-gray-300
text-sm
">


<p>

🆔 UID :

{user.uid}

</p>



<p>

📧 Email :

{user.email || "Non disponible"}

</p>





<p>

📝 Raison :

{user.banReason || "Aucune"}

</p>






<p>

📅 Date :

{

user.bannedAt

?

new Date(
user.bannedAt
)
.toLocaleString()

:

""

}

</p>






</div>









<button

onClick={()=>
unban(user.uid)
}

className="
mt-5
w-full
bg-blue-600
py-3
rounded-xl
font-bold
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
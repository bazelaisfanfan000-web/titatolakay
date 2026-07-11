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





export default function AdminUsersPage(){


const [users,setUsers] =
useState<any[]>([]);


const [search,setSearch] =
useState("");





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









async function banUser(uid:string){



const reason =
prompt(
"Raison du bannissement ?"
);



await update(

ref(
database,
`users/${uid}`
),

{


banned:true,


banReason:
reason || "Non spécifiée",


bannedAt:
Date.now()


}

);



}








async function unbanUser(uid:string){



await update(

ref(
database,
`users/${uid}`
),

{

banned:false,

banReason:null

}

);



}









async function giveReward(uid:string){



const amount =
Number(

prompt(
"Montant HTG à donner ?"
)

);



if(!amount)
return;




const user =
users.find(
(u)=>u.uid===uid
);



const balance =
Number(
user.balance || 0
);





await update(

ref(
database,
`users/${uid}`
),

{

balance:
balance + amount


}

);





}









const filtered =

users.filter(

(user)=>

(user.username || "")
.toLowerCase()
.includes(
search.toLowerCase()
)

||
(user.email || "")
.toLowerCase()
.includes(
search.toLowerCase()
)

);







return(


<div>


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

Gérer les comptes Domino Lakay

</p>






<input

value={search}

onChange={(e)=>
setSearch(e.target.value)
}

placeholder="
Rechercher joueur...
"

className="
mt-8
w-full
bg-white/5
border
border-white/10
rounded-xl
p-4
"

/>







<div className="
mt-8
space-y-5
">





{

filtered.map((user)=>(



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



<div className="
flex
justify-between
">


<h2 className="
font-bold
">

👤 {user.username || "Joueur"}

</h2>



{

user.banned &&

<span className="
text-red-400
text-sm
">

🚫 Banni

</span>

}


</div>







<div className="
mt-4
space-y-2
text-gray-300
text-sm
">


<p>

📧 {user.email || "Pas email"}

</p>



<p>

💰 Solde :
<b>
{" "}
{Math.floor(user.balance || 0)} HTG
</b>

</p>




<p>

🔑 Rôle :
{user.role || "joueur"}

</p>




</div>








<div className="
grid
grid-cols-2
gap-3
mt-5
">



<button

onClick={()=>
giveReward(user.uid)
}

className="
bg-green-600
py-2
rounded-xl
font-bold
"

>

🎁 Donner

</button>







{

user.banned ?

<button

onClick={()=>
unbanUser(user.uid)
}

className="
bg-blue-600
py-2
rounded-xl
font-bold
"

>

🔓 Débannir

</button>


:

<button

onClick={()=>
banUser(user.uid)
}

className="
bg-red-600
py-2
rounded-xl
font-bold
"

>

🚫 Bannir

</button>


}



</div>






</div>



))


}




</div>





</div>


);


}
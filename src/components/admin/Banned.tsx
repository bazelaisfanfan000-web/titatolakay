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
 update,
 remove
} from "firebase/database";





export default function Banned(){


const [banned,setBanned]=useState<any[]>([]);






useEffect(()=>{


const usersRef =
ref(database,"users");


const bansRef =
ref(database,"bans");



let users:any={};

let bans:any={};





function load(){


const list = Object.entries(bans)

.map(([uid,value]:any)=>{


return {

uid,

...(users[uid] || {}),

...value

};


});


setBanned(list);



}





const unsubUsers =

onValue(

usersRef,

(snapshot)=>{


users =
snapshot.val() || {};

load();


}

);







const unsubBans =

onValue(

bansRef,

(snapshot)=>{


bans =
snapshot.val() || {};

load();


}

);







return()=>{

unsubUsers();

unsubBans();

};



},[]);









async function unban(uid:string){



const ok =
confirm(

"Êtes-vous sûr de débloquer ce joueur ?"

);



if(!ok)

return;





await update(

ref(
database,
`users/${uid}`
),

{

banned:false

}

);





await remove(

ref(
database,
`bans/${uid}`
)

);





alert(
"✅ Joueur débloqué"
);



}









async function deleteUser(uid:string){



const ok =
confirm(

"Supprimer définitivement ce compte ?"

);



if(!ok)

return;




await remove(

ref(
database,
`users/${uid}`
)

);



await remove(

ref(
database,
`wallets/${uid}`
)

);



await remove(

ref(
database,
`bans/${uid}`
)

);



alert(
"🗑 Compte supprimé"
);



}











return(


<div className="text-white">



<h1 className="
text-2xl
font-black
">

🚫 Utilisateurs bannis

</h1>



<p className="
text-gray-400
text-sm
mt-2
">

Gestion des comptes bloqués

</p>








<div className="
mt-6
space-y-4
">


{

banned.length === 0 &&


<div className="
bg-white/5
border
border-white/10
rounded-xl
p-5
text-gray-400
">

Aucun utilisateur banni

</div>


}









{

banned.map(user=>(


<div

key={user.uid}

className="
bg-white/5
border
border-red-500/20
rounded-2xl
p-5
"

>


<h2 className="
font-bold
text-lg
">

👤 {user.username || "Joueur"}

</h2>



<p>

📧 {user.email || "Pas email"}

</p>




<p className="
text-xs
text-gray-400
break-all
">

🆔 {user.uid}

</p>





<p className="
mt-3
text-red-400
">

🚫 Raison :

{user.reason || "Non précisée"}

</p>





<p>

⏳ Expire :

{

user.until

?

new Date(
user.until
).toLocaleString()

:

"Permanent"

}

</p>







<div className="
flex
gap-3
mt-5
">


<button

onClick={()=>unban(user.uid)}

className="
bg-green-600
px-4
py-2
rounded-xl
font-bold
"

>

✅ Débannir

</button>






<button

onClick={()=>deleteUser(user.uid)}

className="
bg-red-600
px-4
py-2
rounded-xl
font-bold
"

>

🗑 Supprimer

</button>



</div>






</div>


))


}



</div>







</div>


);


}
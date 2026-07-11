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
onValue
} from "firebase/database";





export default function Economy(){


const [stats,setStats]=useState({

totalBalance:0,

users:0,

online:0,

commission:0

});



const [players,setPlayers]=useState<any[]>([]);







useEffect(()=>{


const usersRef =
ref(database,"users");



const unsubscribe = onValue(

usersRef,

(snapshot)=>{


const data =
snapshot.val() || {};



let total = 0;

let users = 0;

let online = 0;



const list:any[]=[];





Object.entries(data).forEach(

([uid,user]:any)=>{



const balance =
Number(user.balance || 0);



total += balance;


users++;




if(user.online){

online++;

}






list.push({

uid,

username:user.username || "Joueur",

email:user.email || "Pas email",

balance,

online:user.online || false,

role:user.role || "joueur"


});



}



);





setStats({

totalBalance:total,

users,

online,

commission:0

});



setPlayers(list);



}


);



return()=>unsubscribe();



},[]);










return(


<div className="
text-white
w-full
">





<h1 className="
text-xl
font-black
">

💰 Économie plateforme

</h1>



<p className="
text-xs
text-gray-400
">

Gestion financière globale

</p>









<div className="
grid
md:grid-cols-2
gap-3
mt-5
">






<div className="
bg-white/[0.05]
border
border-white/10
rounded-2xl
p-4
">


<p className="
text-xs
text-gray-400
">

🏦 Capital total

</p>



<h2 className="
text-2xl
font-black
text-green-400
mt-2
">

{stats.totalBalance} HTG

</h2>



<p className="
text-[11px]
text-gray-500
mt-1
">

Somme de tous les soldes joueurs

</p>


</div>








<div className="
bg-white/[0.05]
border
border-white/10
rounded-2xl
p-4
">


<p className="
text-xs
text-gray-400
">

📈 Gains plateforme

</p>



<h2 className="
text-2xl
font-black
text-blue-400
mt-2
">

{stats.commission} HTG

</h2>


</div>







</div>









<div className="
grid
grid-cols-3
gap-3
mt-4
">



<Card

title="👥 Utilisateurs"

value={stats.users}

/>



<Card

title="🟢 En ligne"

value={stats.online}

/>



<Card

title="💰 Solde joueurs"

value={`${stats.totalBalance} HTG`}

/>



</div>









<h2 className="
mt-6
text-sm
font-bold
">

👥 Tous les soldes joueurs

</h2>








<div className="
mt-3
space-y-2
">



{

players.map(player=>(



<div

key={player.uid}

className="
bg-white/[0.05]
border
border-white/10
rounded-xl
p-3
flex
justify-between
items-center
"


>


<div>


<p className="
font-bold
text-sm
">

👤 {player.username}

</p>


<p className="
text-[11px]
text-gray-400
">

{player.email}

</p>


</div>





<div className="
text-right
">


<p className="
font-black
text-green-400
">

{player.balance} HTG

</p>



<p className="
text-[10px]
text-gray-400
">

{player.online ? "🟢 En ligne":"⚫ Hors ligne"}

</p>



</div>





</div>



))


}




</div>





</div>


);


}








function Card({

title,

value

}:{

title:string;

value:any;

}){


return(

<div className="
bg-white/[0.05]
border
border-white/10
rounded-xl
p-3
">

<p className="
text-[11px]
text-gray-400
">

{title}

</p>


<p className="
text-lg
font-black
mt-1
">

{value}

</p>


</div>

);


}
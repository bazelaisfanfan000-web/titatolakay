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


import {
  motion
} from "framer-motion";


import {
  Search,
  Ban,
  CheckCircle,
  Wallet,
  Trophy,
  Gamepad2
} from "lucide-react";





export default function AdminUsersPage(){


const [players,setPlayers] =
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
.map(
([uid,user]:any)=>({


uid,

username:
user.username || "Joueur",


email:
user.email || "",


balance:
Number(user.balance || 0),


wins:
Number(user.wins || 0),


loses:
Number(user.loses || 0),


games:
Number(user.gamesPlayed || 0),


blocked:
user.blocked || false


})
);



setPlayers(list);


}
);



return ()=>unsubscribe();



},[]);









async function toggleBlock(
player:any
){


await update(

ref(
database,
`users/${player.uid}`
),

{

blocked:
!player.blocked

}

);



}









const filtered =

players.filter(
(player)=>

player.username
.toLowerCase()
.includes(
search.toLowerCase()
)

||
player.email
.toLowerCase()
.includes(
search.toLowerCase()
)

);









return(


<div>



<h1

className="

text-2xl

font-black

mb-2

"

>

👥 Gestion des joueurs

</h1>



<p

className="

text-gray-400

text-sm

mb-6

"

>

Voir, rechercher et gérer les comptes joueurs

</p>








<div

className="

relative

mb-6

"

>


<Search

className="

absolute

left-4

top-3

text-gray-400

"

size={18}

/>


<input


value={search}


onChange={
(e)=>setSearch(e.target.value)
}


placeholder="Rechercher un joueur..."

className="

w-full

bg-white/10

border

border-white/20

rounded-2xl

py-3

pl-12

pr-4

outline-none

"

 />


</div>









<div

className="

grid

gap-4

"

>


{

filtered.map(
(player,index)=>(



<motion.div


key={player.uid}


initial={{
opacity:0,
y:20
}}


animate={{
opacity:1,
y:0
}}


transition={{
delay:index*0.03
}}




className="

bg-white/10

border

border-white/20

rounded-3xl

p-5

backdrop-blur-xl

"

>






<div

className="

flex

justify-between

items-center

"

>



<div>


<h2

className="

font-black

text-lg

"

>

{player.username}

</h2>


<p

className="

text-xs

text-gray-400

"

>

{player.email}

</p>


</div>





<button


onClick={()=>toggleBlock(player)}



className={`

p-3

rounded-2xl

${

player.blocked

?

"bg-green-500/20 text-green-300"

:

"bg-red-500/20 text-red-300"

}

`}

>


{

player.blocked

?

<CheckCircle size={20}/>

:

<Ban size={20}/>

}


</button>




</div>








<div

className="

grid

grid-cols-2

gap-3

mt-5

"

>





<div

className="

bg-black/20

rounded-2xl

p-3

"

>


<Wallet size={18}/>


<p className="text-xs text-gray-400">
Solde
</p>


<b>
{player.balance} HTG
</b>


</div>






<div

className="

bg-black/20

rounded-2xl

p-3

"

>


<Trophy size={18}/>


<p className="text-xs text-gray-400">
Victoires
</p>


<b>
{player.wins}
</b>


</div>







<div

className="

bg-black/20

rounded-2xl

p-3

"

>


<Gamepad2 size={18}/>


<p className="text-xs text-gray-400">
Parties
</p>


<b>
{player.games}
</b>


</div>






<div

className="

bg-black/20

rounded-2xl

p-3

"

>


<p className="text-xs text-gray-400">
Défaites
</p>


<b>
{player.loses}
</b>


</div>




</div>









{

player.blocked &&

<p

className="

mt-4

text-red-300

text-sm

font-bold

"

>

🚫 Compte bloqué

</p>

}




</motion.div>


)

)


}



</div>



</div>


);


}
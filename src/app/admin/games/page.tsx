"use client";


import {
  useEffect,
  useState
} from "react";


import {
  ref,
  onValue
} from "firebase/database";


import {
  database
} from "@/lib/firebase";





export default function Games(){



const [games,setGames] =
useState<any[]>([]);





useEffect(()=>{


const roomsRef =
ref(database,"rooms");



const unsubscribe =
onValue(

roomsRef,

(snapshot)=>{


const data =
snapshot.val() || {};



const list =

Object.entries(data)

.map(([id,room]:any)=>({

id,

...room

}));



setGames(list);



}

);



return()=>unsubscribe();



},[]);









return(


<div className="text-white">





<h1 className="
text-3xl
font-black
">

🎮 Gestion des parties

</h1>



<p className="
text-gray-400
mt-2
">

Surveillance des matchs DOMINOS HAÏTI

</p>








<div className="
mt-8
grid
gap-5
">







{

games.length===0 &&


<div className="

bg-yellow-500/10

border

border-yellow-500/20

rounded-3xl

p-6

text-yellow-400

font-bold

">


🎲 Aucune partie disponible


</div>



}









{

games.map((game)=>(



<div

key={game.id}

className="

bg-[#111827]

border

border-white/10

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

🎲 {game.name || "Partie Domino"}

</h2>





<span className="

bg-blue-500/20

text-blue-400

px-3

py-1

rounded-full

text-sm

font-bold

">


{game.status || "Inconnu"}


</span>





</div>









<div className="
mt-6
grid
md:grid-cols-2
gap-3
">





<div className="
bg-black/30
rounded-xl
p-4
">

🆔 ID

<p className="
text-white
mt-1
break-all
">

{game.id}

</p>

</div>








<div className="
bg-black/30
rounded-xl
p-4
">

🎯 Mode

<p className="
text-white
mt-1
">

{game.mode || "1v1"}

</p>

</div>







<div className="
bg-black/30
rounded-xl
p-4
">

💰 Mise

<p className="
text-green-400
mt-1
font-bold
">

{game.bet || 0} HTG

</p>

</div>







<div className="
bg-black/30
rounded-xl
p-4
">

🏦 Pot total

<p className="
text-blue-400
mt-1
font-bold
">

{game.pot || 0} HTG

</p>

</div>







</div>









<div className="
mt-5
bg-black/40
rounded-xl
p-5
">



<h3 className="
font-black
">

📊 Résultat

</h3>




<div className="
mt-3
space-y-2
text-gray-300
">


<p>

🏆 Gagnant :

<span className="
text-white
">

{
game.game?.winner || "Pas encore"

}

</span>

</p>





<p>

💸 Commission plateforme :

<span className="
text-green-400
font-bold
">

{

game.game?.commission ||

Math.floor(
Number(game.pot || 0)
*
0.10
)

}

 HTG

</span>


</p>







<p>

👥 Joueurs :

<span className="
text-white
font-bold
">

{
game.players?.playersCount || 0
}

</span>


</p>





</div>




</div>









<div className="
mt-5
text-sm
text-gray-500
">


📅 Créée :

{

game.createdAt

?

new Date(
game.createdAt
)
.toLocaleString()

:

"Date inconnue"

}



</div>





</div>



))


}





</div>






</div>


);



}
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





export default function AdminGamesPage(){



const [games,setGames] =
useState<any[]>([]);





useEffect(()=>{


const roomsRef =
ref(
database,
"rooms"
);



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


<div>


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

Surveillance des matchs Domino Lakay

</p>








<div className="
mt-8
space-y-5
">



{

games.length===0 &&

<div className="
bg-white/5
rounded-2xl
p-5
">

Aucune partie

</div>

}






{

games.map((game)=>(



<div

key={game.id}

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

🎲 {game.name || "Partie"}

</h2>




<span className="
text-blue-400
font-bold
">

{game.status}

</span>




</div>







<div className="
mt-5
space-y-2
text-gray-300
text-sm
">


<p>

🆔 ID :

{game.id}

</p>



<p>

💰 Mise :

<b>
{game.bet || 0} HTG
</b>

</p>




<p>

🏦 Pot :

<b>
{game.pot || 0} HTG
</b>

</p>





<p>

👥 Joueurs :

<b>
{game.players?.playersCount || 0}
</b>

</p>






<p>

🎯 Mode :

{game.mode || "1v1"}

</p>






<p>

📅 Création :

{

game.createdAt ?

new Date(
game.createdAt
)
.toLocaleString()

:

""

}

</p>







</div>








<div className="
mt-5
bg-black/30
rounded-xl
p-4
">


<p className="
font-bold
">

📊 Résultat

</p>



<p className="mt-2">

🏆 Gagnant :

{

game.game?.winner ||

"Pas encore"

}


</p>




<p>

💸 Commission :

{

game.game?.commission ||

Math.floor(
Number(game.pot || 0)
*
0.10
)

}

 HTG

</p>





</div>








</div>



))


}




</div>







</div>


);


}
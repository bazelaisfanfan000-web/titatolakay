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





export default function Games(){



const [games,setGames]=useState<any[]>([]);





useEffect(()=>{


const gamesRef =
ref(database,"games");



return onValue(

gamesRef,

(snapshot)=>{


const data =
snapshot.val();



if(!data){

setGames([]);

return;

}





setGames(

Object.entries(data)

.map(([id,value]:any)=>(

{

id,

...value

}

))

);


}

);



},[]);










async function stopGame(id:string){



const ok =
confirm(

"Arrêter cette partie ?"

);



if(!ok)

return;




await update(

ref(
database,
`games/${id}`
),

{

status:"stopped"

}

);



}







async function deleteGame(id:string){


const ok =
confirm(

"Supprimer cette partie ?"

);



if(!ok)

return;




await remove(

ref(
database,
`games/${id}`
)

);



}









return(


<div className="text-white">



<h1 className="
text-2xl
font-black
">

🎮 Gestion des parties

</h1>



<p className="
text-gray-400
text-sm
mt-2
">

Surveillance des matchs Domino Lakay

</p>








<div className="
mt-6
space-y-4
">





{

games.length===0 &&


<div className="
bg-white/5
border
border-white/10
rounded-xl
p-5
text-gray-400
">

Aucune partie trouvée

</div>


}








{

games.map(game=>(


<div

key={game.id}

className="
bg-white/5
border
border-white/10
rounded-2xl
p-5
"

>





<h2 className="
font-bold
text-lg
">

🎮 Partie #{game.id}

</h2>






<p className="mt-2">

📌 Statut :

<span className="
text-green-400
font-bold
">

{game.status || "waiting"}

</span>

</p>






<p>

💰 Mise :

{game.bet || 0}

 HTG

</p>





<p>

🏦 Pot :

{game.totalBet || 0}

 HTG

</p>







<p>

🏆 Gagnant :

{game.winner || "Pas encore"}

</p>






<p>

👥 Joueurs :

</p>






<div className="
mt-2
bg-black/30
rounded-xl
p-3
text-sm
">


{

game.players

?

Object.values(game.players)

.map(

(player:any,index)=>(


<p key={index}>

👤 {player.username || player.uid}

</p>


)

)

:

<p>
Aucun joueur
</p>


}



</div>









<div className="
flex
gap-3
mt-5
">



<button

onClick={()=>stopGame(game.id)}

className="
bg-yellow-600
px-4
py-2
rounded-xl
font-bold
"

>

⛔ Stop

</button>






<button

onClick={()=>deleteGame(game.id)}

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
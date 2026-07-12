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




export default function Economy(){



const [stats,setStats] = useState({

balance:0,

bets:0,

commission:0,

wins:0,

transactions:0

});





useEffect(()=>{


const usersRef =
ref(database,"users");


const transactionsRef =
ref(database,"transactions");





const stopUsers =
onValue(
usersRef,
(snapshot)=>{


const users =
snapshot.val() || {};



let total = 0;



Object.values(users)
.forEach((user:any)=>{


total += Number(
user.balance || 0
);


});



setStats(prev=>({

...prev,

balance:total

}));



}

);







const stopTransactions =
onValue(
transactionsRef,
(snapshot)=>{


const data =
snapshot.val() || {};



let bets=0;

let wins=0;

let count=0;




Object.values(data)
.forEach((tx:any)=>{


count++;



if(tx.type==="Bet"){

bets += Math.abs(
Number(tx.amount || 0)
);

}



if(tx.type==="WIN"){

wins += Number(
tx.amount || 0
);

}



});



setStats(prev=>({

...prev,

bets,

wins,

transactions:count,

commission:
Math.floor(bets * 0.10)

}));



}

);





return()=>{

stopUsers();

stopTransactions();

};


},[]);







const cards=[


{
title:"Argent joueurs",
value:`${Math.floor(stats.balance)} HTG`,
icon:"💰",
color:"text-green-400"
},


{
title:"Volume des mises",
value:`${stats.bets} HTG`,
icon:"🎮",
color:"text-blue-400"
},


{
title:"Commission",
value:`${stats.commission} HTG`,
icon:"🏦",
color:"text-yellow-400"
},


{
title:"Gains distribués",
value:`${stats.wins} HTG`,
icon:"🏆",
color:"text-purple-400"
},


{
title:"Transactions",
value:stats.transactions,
icon:"📄",
color:"text-white"
}



];






return(


<div className="text-white">



<h1 className="
text-3xl
font-black
">

💰 Économie plateforme

</h1>



<p className="
text-gray-400
mt-2
">

Contrôle financier DOMINOS HAÏTI

</p>







<div className="
grid
md:grid-cols-2
xl:grid-cols-3
gap-5
mt-8
">


{

cards.map((card)=>(


<div

key={card.title}

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


<div className="
text-4xl
">

{card.icon}

</div>


<div className="
w-3
h-3
rounded-full
bg-green-400
">

</div>


</div>




<p className="
text-gray-400
mt-5
">

{card.title}

</p>



<h2 className={`

text-3xl

font-black

mt-2

${card.color}

`}>

{card.value}

</h2>



</div>



))


}



</div>








<div className="

mt-10

bg-[#111827]

border

border-white/10

rounded-3xl

p-6

">


<h2 className="
text-xl
font-black
">

📊 Résumé financier

</h2>





<div className="
mt-6
space-y-4
">


<div className="
flex
justify-between
bg-black/30
p-4
rounded-xl
">

<span>
💵 Argent circulation
</span>


<b>
{Math.floor(stats.balance)} HTG
</b>


</div>






<div className="
flex
justify-between
bg-black/30
p-4
rounded-xl
">


<span>
🎲 Volume jeu
</span>


<b>
{stats.bets} HTG
</b>


</div>







<div className="
flex
justify-between
bg-black/30
p-4
rounded-xl
">


<span>
🏦 Revenus plateforme
</span>


<b className="
text-green-400
">

{stats.commission} HTG

</b>


</div>







<div className="
flex
justify-between
bg-black/30
p-4
rounded-xl
">


<span>
🏆 Gains joueurs
</span>


<b>
{stats.wins} HTG
</b>


</div>




</div>




</div>





</div>


);


}
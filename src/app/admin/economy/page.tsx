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


import {
  motion
} from "framer-motion";


import {
  Wallet,
  Gamepad2,
  Trophy,
  TrendingUp
} from "lucide-react";





export default function AdminEconomyPage(){


const [balance,setBalance] =
useState(0);


const [games,setGames] =
useState(0);


const [rewards,setRewards] =
useState(0);


const [commission,setCommission] =
useState(0);


const [transactions,setTransactions] =
useState<any[]>([]);





useEffect(()=>{





// ==========================
// TOTAL SOLDES JOUEURS
// ==========================


const usersRef =
ref(
database,
"users"
);



const unsubUsers =

onValue(
usersRef,
(snapshot)=>{


const data =
snapshot.val() || {};



let total = 0;



Object.values(data)
.forEach((user:any)=>{


total +=
Number(
user.balance || 0
);


});



setBalance(total);


}
);









// ==========================
// PARTIES + ECONOMIE
// ==========================


const roomsRef =
ref(
database,
"rooms"
);



const unsubRooms =

onValue(
roomsRef,
(snapshot)=>{


const data =
snapshot.val() || {};



let totalGames = 0;

let totalReward = 0;

let totalCommission = 0;



Object.values(data)
.forEach((room:any)=>{



if(
room.game?.status === "finished"
){


totalGames++;


totalReward +=
Number(
room.game?.reward || 0
);



totalCommission +=
Number(
room.game?.commission || 0
);



}



});





setGames(totalGames);

setRewards(totalReward);

setCommission(totalCommission);



}
);









// ==========================
// TRANSACTIONS JEU
// ==========================


const transactionRef =
ref(
database,
"transactions"
);



const unsubTransactions =

onValue(
transactionRef,
(snapshot)=>{


const data =
snapshot.val() || {};



let list:any[]=[];



Object.entries(data)
.forEach(
([uid,userTransactions]:any)=>{


Object.entries(
userTransactions || {}
)
.forEach(
([id,t]:any)=>{


list.push({

id,

...t

});


}

);


}

);




setTransactions(

list

.sort(
(a,b)=>

Number(b.createdAt || 0)

-

Number(a.createdAt || 0)

)

.slice(0,20)

);



}
);









return()=>{

unsubUsers();

unsubRooms();

unsubTransactions();

};


},[]);









const cards=[


{
title:"Soldes joueurs",
value:`${balance} HTG`,
icon:Wallet
},


{
title:"Parties terminées",
value:games,
icon:Gamepad2
},


{
title:"Gains distribués",
value:`${rewards} HTG`,
icon:Trophy
},


{
title:"Commission Ti Ta To",
value:`${commission} HTG`,
icon:TrendingUp
}


];









return(


<div>



<h1

className="

text-2xl

font-black

mb-2

"

>

💰 Économie Ti Ta To

</h1>


<p

className="

text-gray-400

text-sm

mb-6

"

>

Suivi de l'économie du jeu

</p>









<div

className="

grid

grid-cols-1

sm:grid-cols-2

xl:grid-cols-4

gap-5

"

>


{

cards.map(
(card,index)=>{


const Icon =
card.icon;



return(


<motion.div


key={card.title}


initial={{
opacity:0,
y:20
}}


animate={{
opacity:1,
y:0
}}


transition={{
delay:index*0.1
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


<Icon size={32}/>


<p

className="

text-gray-400

text-xs

mt-3

"

>

{card.title}

</p>


<h2

className="

text-xl

font-black

"

>

{card.value}

</h2>


</motion.div>


)


}

)


}



</div>









<div

className="

mt-8

"

>


<h2

className="

font-black

mb-4

"

>

📜 Dernières transactions

</h2>





<div

className="

grid

gap-3

"

>


{

transactions.map(
(t)=>(



<div

key={t.id}

className="

bg-white/10

border

border-white/10

rounded-2xl

p-4

flex

justify-between

"

>



<div>

<p className="font-bold">

{t.type || "GAIN"}

</p>


<p className="text-xs text-gray-400">

{t.gameId || "Partie"}

</p>

</div>




<div>

<p className="font-black text-cyan-300">

{t.amount || 0} HTG

</p>

</div>



</div>


)

)



}



</div>



</div>






</div>


);


}
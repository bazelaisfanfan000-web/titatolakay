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




export default function AdminEconomyPage(){



const [stats,setStats] =
useState({

balance:0,

bets:0,

commission:0,

wins:0,

transactions:0

});





useEffect(()=>{



const usersRef =
ref(
database,
"users"
);



const transactionsRef =
ref(
database,
"transactions"
);





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



let bets = 0;

let wins = 0;

let commission = 0;

let count = 0;





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





commission =

Math.floor(
bets * 0.10
);





setStats(prev=>({


...prev,


bets,


wins,


commission,


transactions:count



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

title:"Argent total joueurs",

value:`${Math.floor(stats.balance)} HTG`,

icon:"💰"

},


{

title:"Total des mises",

value:`${stats.bets} HTG`,

icon:"🎮"

},



{

title:"Commission plateforme",

value:`${stats.commission} HTG`,

icon:"🏦"

},



{

title:"Gains distribués",

value:`${stats.wins} HTG`,

icon:"🏆"

},



{

title:"Transactions",

value:stats.transactions,

icon:"📄"

}



];







return(


<div>


<h1 className="
text-3xl
font-black
">

💰 Gestion financière

</h1>



<p className="
text-gray-400
mt-2
">

Suivi économique Domino Lakay

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
bg-white/5
backdrop-blur-xl
border
border-white/10
rounded-3xl
p-6
"


>


<div className="
text-3xl
">

{card.icon}

</div>



<p className="
text-gray-400
mt-4
">

{card.title}

</p>



<h2 className="
text-2xl
font-black
text-blue-400
">

{card.value}

</h2>



</div>


))


}



</div>








<div className="
mt-10
bg-white/5
border
border-white/10
rounded-3xl
p-6
">


<h2 className="
text-xl
font-bold
">

📊 Résumé financier

</h2>



<div className="
mt-4
space-y-3
text-gray-300
">


<p>
💵 Argent en circulation :
<b>
{" "}
{Math.floor(stats.balance)} HTG
</b>
</p>



<p>
🎲 Volume de jeu :
<b>
{" "}
{stats.bets} HTG
</b>
</p>




<p>
🏦 Revenus plateforme :
<b>
{" "}
{stats.commission} HTG
</b>
</p>




<p>
🏆 Argent donné aux gagnants :
<b>
{" "}
{stats.wins} HTG
</b>
</p>




</div>


</div>






</div>


);


}
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
  Users,
  Gamepad2,
  Wallet,
  Trophy,
  Activity
} from "lucide-react";





export default function AdminDashboard(){



const [users,setUsers] =
useState(0);


const [games,setGames] =
useState(0);


const [money,setMoney] =
useState(0);


const [champion,setChampion] =
useState("Aucun");




useEffect(()=>{



// USERS

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


setUsers(
Object.keys(data).length
);


}
);







// GAMES

const gamesRef =
ref(
database,
"rooms"
);



const unsubGames =
onValue(
gamesRef,
(snapshot)=>{


const data =
snapshot.val() || {};



setGames(
Object.keys(data).length
);


}
);







// MONEY

const moneyRef =
ref(
database,
"users"
);



const unsubMoney =
onValue(
moneyRef,
(snapshot)=>{


const data =
snapshot.val() || {};


let total = 0;



Object.values(data)
.forEach((user:any)=>{


total +=
Number(user.balance || 0);


});



setMoney(total);


}
);







// CHAMPION


const championRef =
ref(
database,
"champions"
);



const unsubChampion =
onValue(
championRef,
(snapshot)=>{


const data =
snapshot.val() || {};



const list =
Object.values(data);



if(list.length){

const last:any =
list[list.length-1];


setChampion(
last.username || "Aucun"
);


}


}
);







return()=>{

unsubUsers();

unsubGames();

unsubMoney();

unsubChampion();

};



},[]);









const cards=[


{
title:"Joueurs",
value:users,
icon:Users
},


{
title:"Parties",
value:games,
icon:Gamepad2
},


{
title:"Argent joueurs",
value:`${money} HTG`,
icon:Wallet
},


{
title:"Champion",
value:champion,
icon:Trophy
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

🏆 Dashboard Admin

</h1>


<p

className="

text-gray-400

text-sm

mb-8

"

>

Vue générale de Ti Ta To

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

cards.map((card,index)=>{


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

backdrop-blur-xl

rounded-3xl

p-5

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


<p

className="

text-gray-400

text-xs

"

>

{card.title}

</p>



<h2

className="

text-xl

font-black

mt-2

"

>

{card.value}

</h2>


</div>



<Icon

size={35}

className="text-cyan-300"

/>


</div>



</motion.div>


)


})

}


</div>









<motion.div


initial={{
opacity:0
}}

animate={{
opacity:1
}}



className="

mt-8

bg-white/5

border

border-white/10

rounded-3xl

p-5

"

>


<div

className="

flex

items-center

gap-3

"

>

<Activity

className="text-green-400"

/>


<div>


<h2

className="

font-bold

"

>

Système actif

</h2>


<p

className="

text-xs

text-gray-400

"

>

Firebase connecté - Mise à jour en temps réel

</p>


</div>


</div>


</motion.div>







</div>


);


}
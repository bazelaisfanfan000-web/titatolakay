"use client";

import {
  useEffect,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";


import {
  auth,
  database
} from "@/lib/firebase";


import {
  onAuthStateChanged
} from "firebase/auth";


import {
  ref,
  onValue
} from "firebase/database";


import {
  useBalance
} from "@/hooks/useBalance";



export default function Dashboard(){


const router = useRouter();



const {
  balance,
  loading:balanceLoading
}=useBalance();




const [
 username,
 setUsername
]=useState("Joueur");



const [
 notificationCount,
 setNotificationCount
]=useState(0);




const [
 stats,
 setStats
]=useState({

wins:0,

games:0

});





useEffect(()=>{


const unsubscribeAuth =

onAuthStateChanged(

auth,

(user)=>{


if(!user){

router.push("/login");

return;

}





const userRef =

ref(

database,

`users/${user.uid}`

);





const unsubscribeUser =

onValue(

userRef,

(snapshot)=>{


const data=snapshot.val();



if(data){


setUsername(

data.username || "Joueur"

);



setStats({

wins:Number(data.wins || 0),

games:Number(data.games || 0)

});


}


}

);






const notifRef =

ref(

database,

`notifications/${user.uid}`

);





const unsubscribeNotif =

onValue(

notifRef,

(snapshot)=>{


const data=snapshot.val();



if(!data){

setNotificationCount(0);

return;

}




const unread =

Object.values(data)

.filter(

(item:any)=>

item.read===false

)

.length;



setNotificationCount(unread);



}

);






return()=>{

unsubscribeUser();

unsubscribeNotif();

};



}

);



return()=>unsubscribeAuth();



},[router]);







return(


<main

className="
min-h-screen
overflow-y-auto
bg-[#050505]
text-white
px-4
pb-40
flex
justify-center
"

>


<section

className="
w-full
max-w-xs
pt-20
"

>





<header

className="
fixed
top-0
left-0
right-0
bg-[#050505]/95
backdrop-blur-xl
border-b
border-white/10
z-50
"

>


<div

className="
max-w-xs
mx-auto
px-4
py-4
flex
justify-between
items-center
"

>


<h1

className="
text-sm
font-black
text-blue-500
"

>

⭕ TI TA TO

</h1>





<button

onClick={()=>router.push("/wallet")}

className="
bg-white/5
border
border-white/10
rounded-xl
px-3
py-2
"

>


<span

className="
text-green-400
font-black
text-xs
"

>

💰 {

balanceLoading

?

"..."

:

Math.floor(balance)

}

HTG

</span>


</button>



</div>


</header>





<div className="mt-2">


<div className="mb-8">


<p className="text-xs text-gray-400">

Salut

</p>



<h2 className="text-sm font-bold">

{username}

</h2>




<div

className="
mt-5
bg-white/5
border
border-white/10
rounded-2xl
p-4
grid
grid-cols-2
text-center
"

>


<div>

<p className="text-yellow-400 font-bold text-sm">

🏆 {stats.wins}

</p>


<p className="text-[10px] text-gray-400">

Victoires

</p>


</div>





<div>

<p className="text-blue-400 font-bold text-sm">

🎮 {stats.games}

</p>


<p className="text-[10px] text-gray-400">

Parties

</p>


</div>



</div>


</div><div

className="
flex
flex-col
gap-3
"

>



<button

onClick={()=>router.push("/create-room")}

className="
w-full
py-3
rounded-xl
bg-blue-600
font-bold
text-sm
shadow-lg
shadow-blue-600/30
"

>

🎮 Créer une partie

</button>





<button

onClick={()=>router.push("/join-room")}

className="
w-full
py-3
rounded-xl
bg-white/10
border
border-white/10
font-bold
text-sm
"

>

🚀 Rejoindre une partie

</button>





<button

onClick={()=>router.push("/spectator")}

className="
w-full
py-3
rounded-xl
bg-purple-600
font-bold
text-sm
"

>

👁️ Mode spectateur

</button>





<button

onClick={()=>router.push("/leaderboard")}

className="
w-full
py-3
rounded-xl
bg-yellow-600
font-bold
text-sm
shadow-lg
shadow-yellow-600/30
"

>

🏆 Classement

</button>



</div>







<div

className="
mt-7
bg-white/5
border
border-white/10
rounded-2xl
p-4
mb-10
"

>


<h2

className="
text-center
font-bold
text-sm
"

>

⭕ Ti Ta To

</h2>




<p

className="
text-xs
text-gray-400
mt-3
"

>

🧪 Version bêta : mode test activé.

</p>




<p

className="
text-xs
text-gray-400
mt-2
"

>

🎁 Bonus test activé.

</p>



</div>






</div>






<nav

className="
fixed
bottom-3
left-1/2
-translate-x-1/2
w-[92%]
max-w-xs
h-14
bg-[#111]/95
border
border-white/10
rounded-2xl
flex
justify-around
items-center
z-50
"

>





<button

onClick={()=>router.push("/dashboard")}

className="text-[10px]"

>

🏠
<br/>
Accueil

</button>







<button

onClick={()=>router.push("/wallet")}

className="text-[10px]"

>

💼
<br/>
Portefeuille

</button>







<button

onClick={()=>router.push("/notifications")}

className="
text-[10px]
relative
"

>

🔔



{

notificationCount > 0 &&

<span

className="
absolute
right-[-10px]
top-[-8px]
bg-red-600
text-white
text-[9px]
font-black
rounded-full
px-1
"

>

{

notificationCount > 9

?

"9+"

:

notificationCount

}

</span>

}



<br/>

Notification


</button>







<button

onClick={()=>router.push("/settings")}

className="text-[10px]"

>

⚙️
<br/>
Paramètre

</button>






</nav>







</section>


</main>


);


}
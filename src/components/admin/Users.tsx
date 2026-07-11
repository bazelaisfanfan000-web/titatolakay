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
get,
set,
push,
update
} from "firebase/database";




export default function Users(){


const [users,setUsers]=useState<any[]>([]);

const [search,setSearch]=useState("");



const [modal,setModal]=useState(false);

const [mode,setMode]=useState<
"give"|"edit"
>("give");


const [selected,setSelected]=useState<any>(null);


const [amount,setAmount]=useState("");







useEffect(()=>{


const usersRef =
ref(database,"users");



return onValue(

usersRef,

(snapshot)=>{


const data =
snapshot.val() || {};



const list:any[]=[];



Object.entries(data).forEach(

([uid,user]:any)=>{


list.push({

uid,

username:user.username || "Joueur",

email:user.email || "Pas email",

balance:Number(user.balance || 0),

wins:user.wins || 0,

games:user.games || 0,

role:user.role || "joueur",

banned:user.banned || false

});


}

);



setUsers(list);



}


);



},[]);










async function saveMoney(){



const value =
Number(amount);



if(!value || value <0){

alert(
"Montant invalide"
);

return;

}



const uid =
selected.uid;



const balanceRef =
ref(
database,
`users/${uid}/balance`
);





if(mode==="give"){



const snap =
await get(balanceRef);



const old =
Number(
snap.val() || 0
);



await set(

balanceRef,

old + value

);



}else{



await set(

balanceRef,

value

);



}







const notif =
push(

ref(
database,
`notifications/${uid}`
)

);






await set(

notif,

{

message:

mode==="give"

?

`🎁 Ti Ta To vous a donné ${value} HTG`

:

`💰 Votre solde a été modifié à ${value} HTG`,

read:false,

createdAt:Date.now()


}

);







setModal(false);

setAmount("");



}









async function banUser(user:any){



const ok =
confirm(
"Êtes-vous sûr de bannir ce joueur ?"
);



if(!ok)
return;




const reason =
prompt(
"Raison du bannissement"
);





await update(

ref(
database,
`users/${user.uid}`
),

{

banned:true,

banReason:
reason || "Aucune raison",

banDate:
Date.now()

}

);






}





const filtered =
users.filter(user=>{


const text =
search.toLowerCase();



return(

user.username
.toLowerCase()
.includes(text)

||

user.email
.toLowerCase()
.includes(text)

||

user.uid
.toLowerCase()
.includes(text)

);


});









return(


<div className="
text-white
w-full
">



<h1 className="
text-2xl
font-black
">

👥 Gestion utilisateurs

</h1>




<input

className="
mt-5
w-full
bg-white/5
border
border-white/10
rounded-xl
p-4
"

placeholder="
Rechercher joueur...
"

value={search}

onChange={
e=>setSearch(e.target.value)
}

/>








<div className="
mt-5
space-y-3
">



{

filtered.map(user=>(



<div

key={user.uid}

className="
bg-white/[0.05]
border
border-white/10
rounded-2xl
p-5
"

>


<div className="
flex
justify-between
">



<div>


<p className="
font-bold
text-lg
">

👤 {user.username}

</p>



<p className="
text-gray-400
text-sm
">

📧 {user.email}

</p>




<p className="
text-green-400
font-black
text-xl
">

💰 {user.balance} HTG

</p>



<p className="
text-xs
text-gray-400
">

🏆 {user.wins} victoires

🎮 {user.games} parties

</p>


</div>






<div className="
flex
flex-col
gap-2
">



<button

onClick={()=>{

setSelected(user);

setMode("give");

setModal(true);

}}

className="
bg-green-600
px-4
py-2
rounded-xl
text-sm
"

>

🎁 Donner

</button>






<button

onClick={()=>{

setSelected(user);

setMode("edit");

setModal(true);

}}

className="
bg-blue-600
px-4
py-2
rounded-xl
text-sm
"

>

✏️ Modifier

</button>







<button

onClick={()=>banUser(user)}

className="
bg-red-600
px-4
py-2
rounded-xl
text-sm
"

>

🚫 Bannir

</button>




</div>



</div>



</div>



))


}



</div>









{

modal &&


<div className="
fixed
inset-0
bg-black/70
flex
items-center
justify-center
z-50
">


<div className="
bg-[#080808]
border
border-white/10
rounded-3xl
p-6
w-96
">


<h2 className="
text-xl
font-black
">

{

mode==="give"

?

"🎁 Donner argent"

:

"✏️ Modifier solde"

}

</h2>



<p className="
text-gray-400
text-sm
mt-2
">

{selected?.username}

</p>




<input

type="number"

value={amount}

onChange={
e=>setAmount(e.target.value)
}

placeholder="Montant HTG"

className="
mt-5
w-full
bg-white/10
border
border-white/20
rounded-xl
p-4
"

/>






<div className="
flex
gap-3
mt-5
">



<button

onClick={()=>setModal(false)}

className="
bg-gray-700
flex-1
py-3
rounded-xl
"

>

Annuler

</button>





<button

onClick={saveMoney}

className="
bg-green-600
flex-1
py-3
rounded-xl
font-bold
"

>

Confirmer

</button>



</div>





</div>


</div>


}



</div>


);


}
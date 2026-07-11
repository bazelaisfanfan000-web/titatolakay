"use client";


import {
useState
} from "react";


import Users from "@/components/admin/Users";
import Games from "@/components/admin/Games";
import Economy from "@/components/admin/Economy";
import Rewards from "@/components/admin/Rewards";
import Banned from "@/components/admin/Banned";
import Settings from "@/components/admin/Settings";





export default function AdminDashboard(){


const [page,setPage]=useState("economy");



const menu=[

{
id:"economy",
name:"💰 Économie plateforme"
},

{
id:"users",
name:"👥 Gestion utilisateurs"
},

{
id:"games",
name:"🎮 Gestion des parties"
},

{
id:"rewards",
name:"🎁 Récompenses"
},

{
id:"banned",
name:"🚫 Utilisateurs bannis"
},

{
id:"settings",
name:"⚙️ Paramètres admin"
}

];





function renderPage(){

switch(page){

case "users":
return <Users/>;


case "games":
return <Games/>;


case "rewards":
return <Rewards/>;


case "banned":
return <Banned/>;


case "settings":
return <Settings/>;


default:
return <Economy/>;

}

}





return(

<main className="
min-h-screen
w-full
bg-black
text-white
p-0
">



<div className="
w-full
min-h-screen
flex
gap-5
p-5
">







{/* MENU GAUCHE */}

<aside className="
w-72
shrink-0
hidden
md:block
bg-white/[0.04]
border
border-white/10
backdrop-blur-xl
rounded-3xl
p-5
h-fit
sticky
top-5
">



<h1 className="
text-xl
font-black
mb-8
text-blue-500
">

👑 Domino Lakay

</h1>



<div className="
space-y-3
">


{
menu.map(item=>(


<button

key={item.id}

onClick={()=>setPage(item.id)}

className={`

w-full
text-left
px-4
py-3
rounded-xl
transition
font-bold
text-sm

${
page===item.id

?

"bg-blue-600 shadow-lg shadow-blue-600/30"

:

"bg-white/5 hover:bg-white/10"

}

`}

>

{item.name}

</button>


))

}



</div>


</aside>









{/* MENU MOBILE */}

<div className="
md:hidden
fixed
top-3
left-3
right-3
z-50
bg-black/80
backdrop-blur-xl
border
border-white/10
rounded-2xl
p-3
">


<select

value={page}

onChange={
e=>setPage(e.target.value)
}

className="
w-full
bg-black
border
border-white/20
rounded-xl
p-3
"

>

{

menu.map(item=>(

<option
key={item.id}
value={item.id}
>

{item.name}

</option>

))

}


</select>


</div>









{/* CONTENU PRINCIPAL */}

<section className="

flex-1

w-full

min-h-screen

bg-white/[0.03]

border

border-white/10

backdrop-blur-xl

rounded-3xl

p-6

overflow-hidden

">


{renderPage()}


</section>






</div>


</main>

);


}
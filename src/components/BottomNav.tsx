"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";


export default function BottomNav(){


const router = useRouter();
const pathname = usePathname();


const [count,setCount] = useState(3);





useEffect(()=>{

const saved = localStorage.getItem("notifications_count");

if(saved){

setCount(Number(saved));

}

},[]);





function openNotifications(){

localStorage.setItem(
"notifications_count",
"0"
);

setCount(0);

router.push("/notifications");

}







return (

<nav className="
fixed
bottom-0
left-0
right-0
z-50
bg-black/60
backdrop-blur-xl
border-t
border-white/10
px-3
py-1
">


<div className="
flex
justify-around
items-center
">





<button

onClick={()=>router.push("/")}

className="
text-white
flex
flex-col
items-center
text-[9px]
"

>

<span className="text-sm">

🏠

</span>

Accueil

</button>








<button

onClick={()=>router.push("/wallet")}

className="
text-white
flex
flex-col
items-center
text-[9px]
"

>

<span className="text-sm">

💼

</span>

Portefeuille

</button>








<button

onClick={openNotifications}

className="
relative
text-white
flex
flex-col
items-center
text-[9px]
"

>


<div className="relative">


<span className="text-sm">

🔔

</span>




{

count > 0 && (

<span className="
absolute
-top-2
-right-3
bg-red-500
text-white
text-[8px]
font-bold
rounded-full
min-w-4
h-4
flex
items-center
justify-center
">

{count}

</span>

)

}



</div>


Notification


</button>








<button

onClick={()=>router.push("/settings")}

className="
text-white
flex
flex-col
items-center
text-[9px]
"

>


<span className="text-sm">

⚙️

</span>


Paramètre


</button>





</div>


</nav>


);


}
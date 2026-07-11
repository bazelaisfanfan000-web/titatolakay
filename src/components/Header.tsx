"use client";

import { useRouter } from "next/navigation";


export default function Header(){


const router = useRouter();



return (

<header className="
fixed
top-0
left-0
right-0
z-50
bg-black/50
backdrop-blur-xl
border-b
border-white/10
px-3
py-2
">


<div className="
flex
items-center
justify-between
">





{/* LOGO GAUCHE */}

<div className="
flex
items-center
gap-2
">


<div className="
w-7
h-7
rounded-lg
bg-white/10
border
border-white/20
flex
items-center
justify-center
text-lg
">

🎮

</div>



<div>


<h1 className="
text-white
font-black
text-xs
">

Ti Ta To

</h1>



<p className="
text-blue-400
text-[9px]
">

Arena

</p>



</div>


</div>








{/* SOLDE CLIQUABLE */}


<button

onClick={()=>router.push("/wallet")}

className="
bg-white/10
border
border-white/20
rounded-lg
px-2
py-1
text-center
active:scale-95
transition
"


>


<p className="
text-gray-400
text-[9px]
">

💰 Solde

</p>



<p className="
text-white
font-black
text-xs
">

1000 HTG

</p>



</button>








</div>


</header>


);


}
"use client";

import {
  useRouter,
} from "next/navigation";

export default function BottomNav(){

const router = useRouter();

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
onClick={()=>router.push("/vylo")}
className="
text-white
flex
flex-col
items-center
text-[9px]
"
>

<span className="text-sm">
👥
</span>

VYLO

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
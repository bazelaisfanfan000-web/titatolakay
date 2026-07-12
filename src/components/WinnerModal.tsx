"use client";

import {
  useEffect,
  useState
} from "react";


interface Props {

winner:string;

mySymbol:string;

reward:number;

onClose:()=>void;

onRequestRematch:()=>void;

}



export default function WinnerModal({

winner,

mySymbol,

reward,

onClose,

onRequestRematch

}:Props){


const [showMoney,setShowMoney] =
useState(false);



const win =
winner === mySymbol;



useEffect(()=>{

const timer =
setTimeout(()=>{

setShowMoney(true);

},700);


return()=>clearTimeout(timer);


},[]);






return(

<div

className="
fixed
inset-0
bg-black/80
backdrop-blur-lg
flex
items-center
justify-center
z-50
p-4
"

>


<div

className="

w-full

max-w-md


bg-gradient-to-br

from-white/20

to-white/5


border

border-white/20


rounded-[35px]


p-8


shadow-2xl


text-center


animate-in

zoom-in


duration-300

"

>





{

win

?


<>


<div className="
text-7xl
mb-4
animate-bounce
">

🏆

</div>


<h1

className="
text-4xl
font-black
text-green-400
"

>

VICTOIRE

</h1>



<p className="
text-white
text-lg
mt-3
">

Félicitations 🎉

</p>



</>



:


<>


<div className="
text-7xl
mb-4
">

😢

</div>



<h1

className="
text-4xl
font-black
text-red-400
"

>

DÉFAITE

</h1>



<p className="
text-white
text-lg
mt-3
">

La prochaine sera la bonne 💪

</p>



</>

}




{

showMoney &&

<div

className="

mt-8


bg-black/30


rounded-2xl


py-5


border

border-yellow-400/30

"

>


<p className="
text-gray-300
text-sm
">

Récompense

</p>



<p

className="
text-4xl
font-black
text-yellow-400
animate-pulse
"

>

💰 {win ? "+" : ""}{reward} HTG

</p>



</div>


}






<button

onClick={onRequestRematch}

className="

mt-8

w-full


bg-gradient-to-r

from-green-500

to-emerald-600


py-4


rounded-2xl


text-white


font-black


text-lg


shadow-lg


hover:scale-105


transition

"

>

🔄 Revanche

</button>






<button

onClick={onClose}

className="

mt-3

w-full


bg-white/10


border

border-white/20


py-4


rounded-2xl


text-white


font-bold


hover:bg-white/20


transition

"

>

🏠 Retour accueil

</button>





</div>


</div>


);


}
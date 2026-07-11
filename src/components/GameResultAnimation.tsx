"use client";


import { useEffect } from "react";


type Props = {

  winner:string;

  mySymbol:string;

  reward:number;

  onClose:()=>void;

};



export default function WinnerModal({

  winner,

  mySymbol,

  reward,

  onClose

}:Props){



const victory =
winner === mySymbol;




useEffect(()=>{


const audio = new Audio(

victory

?

"/sounds/win.mp3"

:

"/sounds/lose.mp3"

);



audio.volume = 0.7;


audio.play()
.catch(()=>{});



},[victory]);






return (

<div

className="
fixed
inset-0
bg-black/80
flex
items-center
justify-center
z-50
"

>



<div

className={`
rounded-3xl
p-8
text-center
w-80
shadow-2xl

${

victory

?

"bg-green-600"

:

"bg-red-600"

}

`}

>



{

victory

?

<>

<div className="
text-6xl
animate-bounce
">

🎉

</div>


<h1 className="
text-3xl
font-black
mt-3
">

🏆 VICTOIRE !

</h1>



<p className="
mt-4
text-xl
">

Tu as aligné 4 symboles

</p>


<p className="
text-2xl
font-bold
mt-3
">

🎁 +{reward} HTG

</p>


<div className="
mt-4
text-3xl
animate-pulse
">

✨✨✨

</div>


</>



:


<>


<div className="
text-6xl
animate-pulse
">

❌

</div>


<h1 className="
text-3xl
font-black
mt-3
">

DÉFAITE

</h1>


<p className="
mt-4
text-xl
">

L'adversaire a gagné

</p>



</>


}





<button


onClick={onClose}


className="
bg-white
text-black
font-bold
rounded-xl
px-6
py-3
mt-6
"

>


Retour accueil


</button>



</div>


</div>


);


}
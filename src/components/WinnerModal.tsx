"use client";


type Props = {

  winner:string;

  mySymbol:"X"|"O"|"";


  reward:number;

  bet:number;

  pot:number;

  commission:number;


  friendStatus:
  "none" |
  "pending" |
  "friend";


  onAddFriend:()=>void;

  onClose:()=>void;

};




export default function WinnerModal({

winner,

mySymbol,

reward,

bet,

pot,

commission,

friendStatus,

onAddFriend,

onClose


}:Props){



const isWinner =
winner === mySymbol;




return (

<div

className="
fixed
inset-0
bg-black/80
backdrop-blur-sm
flex
items-center
justify-center
z-50
p-4
"

>


<div

className="
bg-gradient-to-br
from-blue-950
via-black
to-black
border
border-blue-400/30
rounded-3xl
p-6
w-full
max-w-md
text-center
shadow-2xl
"

>



<div

className="
text-6xl
mb-4
"

>

{
isWinner
?
"🏆"
:
"😢"
}

</div>





<h2

className="
text-3xl
font-black
mb-3
"

>

{
isWinner
?
"VICTOIRE !"
:
"DEFAITE"
}

</h2>





<p

className="
text-white/70
mb-5
"

>

{
isWinner
?
"Félicitations, vous avez gagné 🎉"
:
"Votre adversaire a gagné"
}

</p>







<div

className="
bg-white/5
border
border-white/10
rounded-2xl
p-4
mb-4
space-y-3
text-left
"

>



<div className="flex justify-between">

<span>
💵 Mise
</span>

<b>
{bet} HTG
</b>

</div>




<div className="flex justify-between">

<span>
🏦 Pot total
</span>

<b>
{pot} HTG
</b>

</div>





<div className="flex justify-between text-red-400">

<span>
🏛️ Commission
</span>

<b>
-{commission} HTG
</b>

</div>



</div>








{

isWinner ?

(

<div

className="
bg-yellow-500/10
border
border-yellow-400/30
rounded-2xl
p-4
mb-4
"

>


<p>
💰 Gain reçu
</p>



<p

className="
text-yellow-400
text-4xl
font-black
"

>

+{reward} HTG

</p>



</div>


)

:

(

<div

className="
bg-red-500/10
border
border-red-400/30
rounded-2xl
p-4
mb-4
"

>


<p>
💸 Perte
</p>



<p

className="
text-red-400
text-4xl
font-black
"

>

-{bet} HTG

</p>



</div>


)

}









{

friendStatus !== "friend" &&

<button


onClick={onAddFriend}


disabled={
friendStatus==="pending"
}


className="
w-full
mb-3
bg-blue-600
hover:bg-blue-700
disabled:bg-gray-600
rounded-xl
py-3
font-bold
transition
"

>

{

friendStatus==="pending"

?

"📩 Demande envoyée"

:

"🤝 Ajouter comme ami"

}

</button>


}








<button


onClick={onClose}


className="
w-full
bg-white/10
hover:bg-white/20
border
border-white/20
rounded-xl
py-3
font-bold
transition
"

>

⬅️ Retour au tableau de bord

</button>






</div>


</div>


);


}
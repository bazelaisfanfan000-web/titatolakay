"use client";


type Props = {

  winner:string;

  mySymbol:"X"|"O"|"";

  reward:number;

  friendStatus:
  "none"|
  "pending"|
  "friend";

  onAddFriend:()=>void;

  onClose:()=>void;

};



export default function WinnerModal({

winner,

mySymbol,

reward,

friendStatus,

onAddFriend,

onClose

}:Props){



const isWinner =
winner === mySymbol;



return (

<div className="
fixed
inset-0
bg-black/70
flex
items-center
justify-center
z-50
p-4
">


<div className="
bg-gradient-to-br
from-blue-900
to-black
border
border-blue-400/30
rounded-3xl
p-6
w-full
max-w-md
text-center
shadow-2xl
">


<div className="text-5xl mb-4">

{
isWinner
?
"🎉"
:
"😢"
}

</div>



<h2 className="text-3xl font-black mb-3">

{
isWinner
?
"VICTOIRE !"
:
"DEFAITE"
}

</h2>




<p className="mb-4">

{
isWinner
?
"🏆 Vous avez gagné"
:
"Votre adversaire a gagné"
}

</p>




{

isWinner &&

<div className="
bg-yellow-500/10
border
border-yellow-400/30
rounded-xl
p-4
mb-4
">


<p>

💰 Gain reçu

</p>


<p className="
text-yellow-400
text-3xl
font-black
">

+{reward} HTG

</p>


</div>

}




{

isWinner && friendStatus !== "friend" &&

<button

onClick={onAddFriend}

className="
w-full
mb-3
bg-blue-600
hover:bg-blue-700
rounded-xl
py-3
font-bold
"

>

🤝 Ajouter comme ami

</button>

}




<button

onClick={onClose}

className="
w-full
bg-white/10
border
border-white/20
rounded-xl
py-3
font-bold
"

>

Retour au tableau de bord

</button>



</div>


</div>

);


}
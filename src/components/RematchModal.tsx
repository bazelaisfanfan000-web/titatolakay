"use client";


interface Props{

requestedBy:string;

myUid:string;

onAccept:()=>void;

onReject:()=>void;

}



export default function RematchModal({

requestedBy,

myUid,

onAccept,

onReject

}:Props){



return(

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
bg-white
text-black
rounded-3xl
p-6
text-center
">


{

requestedBy===myUid

?

<>

<h2 className="
text-xl
font-bold
">

⏳ Revanche envoyée

</h2>


<p className="mt-3">

Attente de l'autre joueur...

</p>

</>


:

<>

<h2 className="
text-xl
font-bold
">

⚔️ Demande de revanche

</h2>


<p className="mt-3">

Le joueur veut recommencer.

</p>


<div className="
flex
gap-3
mt-5
">


<button

onClick={onAccept}

className="
bg-green-600
text-white
px-5
py-3
rounded-xl
"

>

✅ Accepter

</button>



<button

onClick={onReject}

className="
bg-red-600
text-white
px-5
py-3
rounded-xl
"

>

❌ Refuser

</button>


</div>


</>

}



</div>


</div>


);


}
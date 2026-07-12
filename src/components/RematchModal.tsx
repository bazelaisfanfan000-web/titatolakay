"use client";


type Props = {

requestedBy:string;

requesterName:string;

myUid:string;

onAccept:()=>void;

onReject:()=>void;

};



export default function RematchModal({

requestedBy,

requesterName,

myUid,

onAccept,

onReject

}:Props){



if(requestedBy === myUid){

return null;

}



return (

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
max-w-sm
bg-white/10
border
border-white/20
rounded-3xl
p-6
text-center
shadow-2xl
"

>


<div className="
text-6xl
mb-4
">

🎮

</div>



<h1 className="
text-2xl
font-black
text-white
">

Demande de revanche

</h1>




<p className="
mt-5
text-white
text-lg
">

<b>

{requesterName}

</b>

</p>



<p className="
text-gray-300
mt-1
">

veut rejouer une partie

</p>




<p className="
mt-5
text-yellow-400
font-black
">

💰 Même mise : partie précédente

</p>




<div className="
flex
gap-3
mt-8
">


<button

onClick={onReject}

className="
flex-1
py-3
rounded-xl
bg-red-600
font-black
text-white
"

>

❌ Refuser

</button>





<button

onClick={onAccept}

className="
flex-1
py-3
rounded-xl
bg-green-600
font-black
text-white
"

>

✅ Accepter

</button>




</div>


</div>


</div>


);


}
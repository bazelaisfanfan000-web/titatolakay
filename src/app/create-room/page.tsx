"use client";


import {
  useState
} from "react";


import {
  useRouter
} from "next/navigation";


import {
  auth
} from "@/lib/firebase";


import BackButton
from "@/components/BackButton";






export default function CreateRoomPage(){


const router =
useRouter();



const [name,setName] =
useState("");



const [bet,setBet] =
useState("");



const [mode,setMode] =
useState("1v1");



const [loading,setLoading] =
useState(false);



const [error,setError] =
useState("");








async function createRoom(){


try{


setError("");



const user =
auth.currentUser;



if(!user){


throw new Error(
"Connecte-toi d'abord"
);


}






if(
!bet ||
Number(bet)<=0
){


throw new Error(
"Entre une mise valide"
);


}






setLoading(true);





const token =
await user.getIdToken();








const response =
await fetch(

"/api/game/create",

{


method:"POST",



headers:{


"Content-Type":
"application/json",


"Authorization":
`Bearer ${token}`


},





body:JSON.stringify({

name:
name.trim()
?
name
:
"Partie TiTaTo",


bet:
Number(bet),


mode,


gameType:
"titato"


})


}

);









const data =
await response.json();








if(!response.ok){


throw new Error(

data.error ||

"Erreur création"

);


}








router.push(

`/room/${data.roomId}`

);







}

catch(err:any){


setError(
err.message
);


}

finally{


setLoading(false);


}


}









return(


<main


className="
min-h-screen
bg-gradient-to-br
from-[#020617]
via-[#07152f]
to-black
text-white
px-5
pt-16
"


>



<div


className="
max-w-sm
mx-auto
"


>




<div className="mb-5">

<BackButton/>

</div>







<div


className="
bg-white/10
border
border-white/20
rounded-3xl
p-5
backdrop-blur-xl
shadow-2xl
"


>






<h1


className="
text-2xl
font-black
text-center
mb-6
"


>

🎮 Créer une partie TiTaTo

</h1>








<input


value={name}


onChange={

e=>
setName(e.target.value)

}


placeholder="Nom de la partie (optionnel)"


className="
w-full
p-3
rounded-xl
bg-black/30
border
border-white/10
mb-3
text-sm
outline-none
"


/>









<input


type="number"


value={bet}


onChange={

e=>
setBet(e.target.value)

}


placeholder="Mise HTG"


className="
w-full
p-3
rounded-xl
bg-black/30
border
border-white/10
mb-3
text-sm
outline-none
"


/>









<select


value={mode}


onChange={

e=>
setMode(e.target.value)

}


className="
w-full
p-3
rounded-xl
bg-black/30
border
border-white/10
mb-5
text-sm
"


>




<option value="1v1">

1 VS 1

</option>





<option value="2v2">

2 VS 2

</option>





</select>









<button


onClick={createRoom}


disabled={loading}


className="
w-full
py-3
rounded-2xl
font-black
text-sm
bg-gradient-to-b
from-blue-400
to-blue-700
border-b-4
border-blue-950
shadow-[0_6px_0_#00143d]
active:translate-y-1
active:border-b-0
transition-all
"


>


{

loading

?

"Création..."

:

"🎮 Créer la partie"

}



</button>









{

error &&


<p


className="
text-red-400
text-xs
text-center
mt-4
font-bold
"


>

{error}

</p>


}








</div>






</div>





</main>


);


}
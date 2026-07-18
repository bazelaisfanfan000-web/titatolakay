"use client";


import {
useState
} from "react";


import {
auth
} from "@/lib/firebase";



export default function TchotchomWithdrawButton(){


const [amount,setAmount] =
useState(500);


const [phone,setPhone] =
useState("");


const [loading,setLoading] =
useState(false);





async function withdraw(){


try{


setLoading(true);



const user =
auth.currentUser;



if(!user){

alert(
"Connexion requise"
);

return;

}




const token =
await user.getIdToken();





const response =
await fetch(
"/api/wallet/withdraw/create",
{


method:"POST",


headers:{

"Content-Type":
"application/json"

},


body:JSON.stringify({

token,

uid:user.uid,

amount:Number(amount),

phone


})


}

);





const data =
await response.json();





if(!response.ok){


alert(
data.error ||
"Erreur retrait"
);


return;

}





alert(
"✅ Retrait envoyé avec succès"
);





}
catch(error){


console.error(error);


alert(
"Erreur serveur"
);


}
finally{


setLoading(false);


}



}






return (

<div
className="
p-5
rounded-2xl
bg-zinc-900
border
border-zinc-800
space-y-4
"
>



<h3
className="
font-bold
text-xl
"
>
💸 Retirer des fonds
</h3>






<input

type="text"

placeholder="Numéro MonCash"

value={phone}

onChange={
e=>setPhone(
e.target.value
)
}

className="
w-full
p-3
rounded-xl
bg-black
border
border-zinc-700
text-white
"

/>





<select

value={amount}

onChange={
e=>setAmount(
Number(e.target.value)
)
}

className="
w-full
p-3
rounded-xl
bg-black
text-white
"


>


<option value={500}>
500 HTG
</option>


<option value={1000}>
1000 HTG
</option>


<option value={2500}>
2500 HTG
</option>


<option value={5000}>
5000 HTG
</option>


<option value={10000}>
10000 HTG
</option>


</select>






<button

onClick={withdraw}

disabled={loading}

className="
w-full
bg-green-600
hover:bg-green-700
py-3
rounded-xl
font-bold
"


>

{

loading
?
"Traitement..."
:
"💸 Retirer"

}


</button>




</div>


);


}
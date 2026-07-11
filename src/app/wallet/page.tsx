"use client";

import {
  useEffect,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";


import {
  auth,
  database
} from "@/lib/firebase";


import {
  onAuthStateChanged
} from "firebase/auth";


import {
  ref,
  onValue
} from "firebase/database";


import {
  useBalance
} from "@/hooks/useBalance";




export default function WalletPage(){


const router = useRouter();


const {
  balance,
  loading:balanceLoading
}=useBalance();


const [username,setUsername] = useState("Joueur");

const [loading,setLoading] = useState(true);





useEffect(()=>{


const unsubscribeAuth =
onAuthStateChanged(auth,(user)=>{


if(!user){

router.push("/login");

return;

}





const userRef =
ref(
database,
`users/${user.uid}`
);





const unsubscribeData =
onValue(

userRef,

(snapshot)=>{


const data =
snapshot.val();




if(data){


setUsername(
data.username || "Joueur"
);




}



setLoading(false);




}



);




return ()=>unsubscribeData();



});



return ()=>unsubscribeAuth();



},[router]);





if(loading || balanceLoading){


return(

<main className="
min-h-screen
bg-black
text-white
flex
items-center
justify-center
">

Chargement portefeuille...

</main>

);

}





return(


<main className="
min-h-screen
bg-black
text-white
p-4
pb-20
">





<div className="
max-w-sm
mx-auto
">



<header className="
flex
items-center
justify-between
mb-8
">


<button

onClick={()=>router.back()}

className="
text-gray-400
"

>

← Retour

</button>





<h1 className="
font-black
text-lg
">

💼 Portefeuille

</h1>


<div></div>


</header>





<section className="
bg-gradient-to-r
from-blue-600
to-green-500
rounded-3xl
p-6
shadow-xl
">


<p className="
text-sm
opacity-80
">

Solde disponible

</p>



<h2 className="
text-4xl
font-black
mt-2
">

💰 {Math.floor(balance)} HTG

</h2>



<p className="
text-xs
mt-3
opacity-80
">

Compte : {username}

</p>



</section>





<section className="
mt-6
bg-white/10
border
border-white/10
rounded-2xl
p-5
">


<h2 className="
font-bold
mb-3
">

💳 Actions

</h2>



<button

className="
w-full
py-3
rounded-xl
bg-blue-600
font-bold
mb-3
"

onClick={()=>alert(
"Les dépôts seront disponibles après la bêta"
)}

>

➕ Déposer

</button>





<button

className="
w-full
py-3
rounded-xl
bg-white/10
font-bold
"

onClick={()=>alert(
"Les retraits seront disponibles après la bêta"
)}

>

💸 Retirer

</button>




</section>





<section className="
mt-6
bg-white/5
border
border-white/10
rounded-2xl
p-5
">


<h2 className="
font-bold
">

📌 Information

</h2>


<p className="
text-sm
text-gray-400
mt-3
">

Version bêta : les paiements réels sont désactivés.

</p>



</section>





</div>



</main>


);


}

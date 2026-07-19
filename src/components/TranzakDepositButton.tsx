"use client";


import {
useState
} from "react";


import {
auth
} from "@/lib/firebase";



export default function TranzakDepositButton(){


const [loading,setLoading]
=
useState(false);





async function deposit(){


try{


setLoading(true);



const user =
auth.currentUser;



if(!user){


alert(
"Connecte-toi d'abord"
);

return;


}




const token =
await user.getIdToken();





const res =
await fetch(

"/api/wallet/deposit/create",

{

method:"POST",


headers:{


"Content-Type":
"application/json",


Authorization:
`Bearer ${token}`


},


body:JSON.stringify({

amount:100

})


}

);






const data =
await res.json();





if(!res.ok){


console.log(data);


alert(
data.error ||
"Erreur création paiement"
);


return;


}





if(data.paymentUrl){


window.location.href =
data.paymentUrl;


}



}
catch(error){


console.log(error);


alert(
"Erreur serveur"
);


}
finally{


setLoading(false);


}



}






return (

<button

onClick={deposit}

disabled={loading}

className="
w-full
bg-blue-600
hover:bg-blue-700
rounded-2xl
py-4
font-bold
text-white
"

>


{

loading

?

"Création paiement..."

:

"💰 Déposer HTG"

}



</button>


);


}
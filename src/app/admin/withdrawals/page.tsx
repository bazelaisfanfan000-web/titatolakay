"use client";


import {
useEffect,
useState
} from "react";


import {
auth
} from "@/lib/firebase";


import {
ref,
onValue,
update
} from "firebase/database";


import {
database
} from "@/lib/firebase";




export default function WithdrawalsPage(){


const [withdrawals,setWithdrawals] =
useState<any[]>([]);



useEffect(()=>{


const withdrawalsRef =
ref(
database,
"withdrawals"
);



return onValue(
withdrawalsRef,
(snapshot)=>{


const data =
snapshot.val();



const list:any[]=[];



if(data){


Object.entries(data)
.forEach(
([uid,items]:any)=>{


Object.entries(items)
.forEach(
([id,withdraw]:any)=>{


list.push({

uid,

id,

...withdraw

});


});


});


}



setWithdrawals(list);


}

);


},[]);








async function approve(
item:any
){


await update(
ref(
database,
`withdrawals/${item.uid}/${item.id}`
),
{

status:"approved",

approvedAt:
Date.now()


}

);



alert(
"Retrait accepté"
);


}








async function reject(
item:any
){


await update(
ref(
database,
`withdrawals/${item.uid}/${item.id}`
),
{

status:"rejected",

rejectedAt:
Date.now()


}

);



alert(
"Retrait refusé"
);


}







return (

<div
className="
min-h-screen
bg-black
text-white
p-6
"
>


<h1
className="
text-3xl
font-bold
mb-6
"
>

💸 Gestion des retraits

</h1>





<div
className="
grid
gap-4
"
>



{
withdrawals.length===0

?

<p>
Aucun retrait
</p>


:

withdrawals.map(
(item)=>(


<div

key={
item.id
}

className="
bg-zinc-900
border
border-zinc-800
rounded-2xl
p-5
"

>


<h2
className="
font-bold
"
>

Utilisateur:
{item.uid}

</h2>



<p>
Montant:
<b>
{item.amount} HTG
</b>
</p>



<p>
Téléphone:
{item.phone}
</p>



<p>
Statut:
{item.status}
</p>





{
item.status==="pending"
&&

<div
className="
flex
gap-3
mt-4
"
>


<button

onClick={()=>
approve(item)
}

className="
bg-green-600
px-4
py-2
rounded-xl
"

>

✅ Accepter

</button>





<button

onClick={()=>
reject(item)
}

className="
bg-red-600
px-4
py-2
rounded-xl
"

>

❌ Refuser

</button>



</div>

}



</div>


)


)

}



</div>


</div>


);


}
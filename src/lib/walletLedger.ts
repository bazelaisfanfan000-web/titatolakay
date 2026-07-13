import {
  adminDB
} from "./firebaseAdmin";





export type TransactionType =

"deposit" |

"bet" |

"win" |

"withdraw" |

"commission";







export async function addTransaction(
uid:string,
data:{
type:TransactionType;
amount:number;
roomId?:string;
status?:string;
}
){



await adminDB
.ref(
`transactions/${uid}`
)
.push({

type:data.type,

amount:data.amount,

roomId:data.roomId || null,

status:data.status || "completed",

createdAt:Date.now()


});


}









export async function getBalance(
uid:string
){



const snap =

await adminDB
.ref(
`users/${uid}/balance`
)
.get();



return Number(
snap.val() || 0
);


}









export async function addBalance(

uid:string,

amount:number

){



const balance =
await getBalance(uid);



await adminDB
.ref(
`users/${uid}/balance`
)
.set(

balance + amount

);



}









export async function removeBalance(

uid:string,

amount:number

){



const balance =
await getBalance(uid);





if(balance < amount){

throw new Error(
"Solde insuffisant"
);

}




await adminDB
.ref(
`users/${uid}/balance`
)
.set(

balance - amount

);



}
import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";


import {
  getWallet,
  getTransactions
} from "@/lib/wallet";




/**
 * API Route pour obtenir les transactions d'un utilisateur
 */
export async function GET(
request: Request
){


try{


const { searchParams } =
new URL(request.url);


const uid =
searchParams.get("uid");


const limit =
Number(searchParams.get("limit")) || 50;


const type =
searchParams.get("type");




if(!uid){


return NextResponse.json(

{
error:"UID manquant"
},

{
status:400
}

);


}





const wallet =
await getWallet(uid);




if(!wallet){


return NextResponse.json(

{
error:"Wallet introuvable"
},

{
status:404
}

);


}





let transactions =
await getTransactions(uid, limit);




if(type){


transactions =
transactions.filter(t => t.type === type);


}




return NextResponse.json({

success:true,

wallet:{

balance:wallet.balance,

locked:wallet.locked,

available:wallet.balance - wallet.locked


},

transactions



});



}
catch(error:any){


console.error(
"GET TRANSACTIONS ERROR:",
error
);




return NextResponse.json(

{
error:
error.message ||
"Erreur serveur"
},

{
status:500
}

);


}


}




/**
 * API Route pour obtenir le solde d'un utilisateur
 */
export async function POST(
request: Request
){


try{


const body =
await request.json();



const {
uid
}=body;




if(!uid){


return NextResponse.json(

{
error:"UID manquant"
},

{
status:400
}

);


}





const wallet =
await getWallet(uid);




if(!wallet){


return NextResponse.json(

{
error:"Wallet introuvable"
},

{
status:404
}

);


}





return NextResponse.json({

success:true,

wallet:{

balance:wallet.balance,

locked:wallet.locked,

available:wallet.balance - wallet.locked


}



});



}
catch(error:any){


console.error(
"GET WALLET ERROR:",
error
);




return NextResponse.json(

{
error:
error.message ||
"Erreur serveur"
},

{
status:500
}

);


}


}

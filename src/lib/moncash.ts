const BASE_URL =
"https://api.moncashconnect.com/v1";





export async function createMonCashPayment(

amount:number,

referenceId:string,

customerName:string

){


const response =

await fetch(

`${BASE_URL}/pay-create`,

{


method:"POST",


headers:{


"Authorization":

`Bearer ${process.env.MCC_SECRET}`,



"Content-Type":

"application/json",


"Origin":

process.env.NEXT_PUBLIC_APP_URL || ""


},



body:JSON.stringify({

amount,

referenceId,


returnUrl:

`${process.env.NEXT_PUBLIC_APP_URL}/checkout/return`,


customerName


})


}

);





const data =

await response.json();





if(!response.ok){


throw new Error(

data.error ||

"Erreur création paiement MonCash"

);


}




return data;


}









export async function createMonCashPayout(


amount:number,


number:string,


referenceId:string


){





const response =

await fetch(

`${BASE_URL}/payout-create`,

{


method:"POST",



headers:{



"Authorization":

`Bearer ${process.env.MCC_SECRET}`,



"Content-Type":

"application/json"



},





body:JSON.stringify({



amount,



moncashNumber:number,



referenceId



})



}


);






const data =

await response.json();






if(!response.ok){


throw new Error(

data.error ||

"Erreur retrait MonCash"

);


}





return data;



}







export async function checkMonCashPayment(


referenceId:string


){



const response =

await fetch(

`${BASE_URL}/pay-status?referenceId=${referenceId}`,

{


method:"GET",


headers:{


"Authorization":

`Bearer ${process.env.MCC_SECRET}`


}



}


);






const data =

await response.json();






if(!response.ok){


throw new Error(

data.error ||

"Erreur vérification paiement"

);


}





return data;



}
const BASE_URL =
  process.env.MONCASH_API_URL ||
  "https://api.moncashconnect.com/v1";



const API_KEY =
  process.env.MONCASH_API_KEY ||
  process.env.MCC_SECRET ||
  "";




export async function createMonCashPayment(

  amount:number,

  referenceId:string,

  customerName:string

){


  if(!API_KEY){

    throw new Error(
      "Clé MonCash manquante dans .env.local"
    );

  }



  const response = await fetch(

    `${BASE_URL}/pay-create`,

    {

      method:"POST",


      headers:{


        "Authorization":
          `Bearer ${API_KEY}`,


        "Content-Type":
          "application/json",


        "Accept":
          "application/json",


        "Origin":
          process.env.NEXT_PUBLIC_APP_URL || ""

      },


      body:JSON.stringify({

        amount,


        referenceId,


        customerName,


        returnUrl:

          `${process.env.NEXT_PUBLIC_APP_URL}/checkout/return`


      })


    }

  );



  const text =
    await response.text();



  let data:any = {};



  try {

    data =
      JSON.parse(text);

  }

  catch {

    data =
      {
        raw:text
      };

  }




  console.log(
    "MONCASH CREATE PAYMENT RESPONSE:",
    {
      status:response.status,
      data
    }
  );




  if(!response.ok){


    throw new Error(

      JSON.stringify(data)

    );


  }




  return data;


}






export async function createMonCashPayout(

amount:number,

number:string,

referenceId:string

){


 const response = await fetch(

 `${BASE_URL}/payout-create`,

 {

 method:"POST",


 headers:{


 "Authorization":

 `Bearer ${API_KEY}`,


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

 JSON.stringify(data)

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

headers:{


"Authorization":

`Bearer ${API_KEY}`


}

}

);



const data =
await response.json();



if(!response.ok){


throw new Error(

JSON.stringify(data)

);


}



return data;


}
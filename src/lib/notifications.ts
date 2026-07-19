import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";


import {
  firestore
} from "./firebase";



export async function sendNotification(

  userId:string,

  data:{
    title:string;

    message:string;

    type:string;

    amount?:number;

    from?:string;

    text?:string;

    friendId?:string;

    link?:string;
  }

){


  try{


    await addDoc(

      collection(
        firestore,
        "notifications",
        userId,
        "items"
      ),

      {


        title:data.title,


        message:data.message,


        type:data.type,



        amount:
        data.amount || 0,



        // message ami

        from:
        data.from || "",



        text:
        data.text || "",



        friendId:
        data.friendId || "",



        // redirection

        link:
        data.link || "",



        read:false,



        createdAt:
        serverTimestamp()


      }

    );



  }catch(error){


    console.error(
      "Erreur création notification:",
      error
    );


    throw error;


  }


}

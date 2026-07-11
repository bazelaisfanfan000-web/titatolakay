"use client";

import { useEffect } from "react";

import {
  auth,
  database
} from "@/lib/firebase";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  ref,
  update
} from "firebase/database";


export default function Presence(){


useEffect(()=>{


let timer:any;



const unsubscribe = onAuthStateChanged(

auth,

(user)=>{


if(!user) return;



const updateOnline = async()=>{


await update(

ref(
database,
`users/${user.uid}`
),

{

lastSeen: Date.now()

}

);


};



updateOnline();



timer = setInterval(

updateOnline,

60000

);



}


);



return()=>{


unsubscribe();


if(timer){

clearInterval(timer);

}


};


},[]);



return null;


}
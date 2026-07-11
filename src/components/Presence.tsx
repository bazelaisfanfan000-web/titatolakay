"use client";

import { 
  useEffect 
} from "react";

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


const unsubscribe = 

onAuthStateChanged(

auth,

(user)=>{


if(!user) return;



const updateOnline = ()=>{


update(

ref(
database,
`users/${user.uid}`
),

{

online:true,

lastSeen:Date.now()

}

);


};





updateOnline();



const timer = setInterval(

updateOnline,

60000

);



return()=>{

clearInterval(timer);

};



}

);



return()=>unsubscribe();



},[]);



return null;


}
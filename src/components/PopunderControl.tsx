"use client";

import { useEffect } from "react";


export default function PopunderControl(){

useEffect(()=>{


const FIVE_MINUTES = 5 * 60 * 1000;


const last =
localStorage.getItem("last_popunder");


const now = Date.now();



if(
!last ||
now - Number(last) > FIVE_MINUTES
){

localStorage.setItem(
"last_popunder",
String(now)
);


// Monetag sera autorisé à fonctionner ici

console.log(
"Popunder autorisé"
);


}


},[]);


return null;

}
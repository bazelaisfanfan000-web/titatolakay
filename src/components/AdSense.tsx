"use client";

import {
  useEffect
} from "react";


declare global {

  interface Window {

    adsbygoogle: any[];

  }

}



export default function AdSense(){


useEffect(()=>{


try{


(window.adsbygoogle = window.adsbygoogle || []).push({});


}catch(error){


console.error(
"AdSense error:",
error
);


}


},[]);



return (

<ins

className="adsbygoogle"

style={{
display:"block"
}}

data-ad-client="ca-pub-5894815902617573"

data-ad-slot="XXXXXXXXXX"

data-ad-format="auto"

data-full-width-responsive="true"

/>

);


}
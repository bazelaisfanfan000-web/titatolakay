"use client";

import {
  useEffect
} from "react";


export default function Popunder(){

  useEffect(()=>{


    const alreadyLoaded =
      document.getElementById(
        "monetag-popunder"
      );


    if(alreadyLoaded) return;



    const script =
      document.createElement(
        "script"
      );


    script.id =
      "monetag-popunder";


    script.src =
      "https://5gvci.com/act/files/tag.min.js?z=11339844";


    script.setAttribute(
      "data-cfasync",
      "false"
    );


    script.async = true;



    document.head.appendChild(
      script
    );



  },[]);



  return null;

}
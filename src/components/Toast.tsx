"use client";

type Props = {

message:string;

type?:
"success"|
"error"|
"info";

};



export default function Toast({

message,

type="info"

}:Props){



if(!message)
return null;



return(

<div

className={`
fixed
bottom-24
left-1/2
-translate-x-1/2
z-[999]
px-5
py-3
rounded-2xl
font-bold
shadow-2xl
text-white

${
type==="success"

?

"bg-green-600"

:

type==="error"

?

"bg-red-600"

:

"bg-blue-600"

}

`}

>

{message}

</div>

);


}
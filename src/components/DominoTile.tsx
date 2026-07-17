"use client";


interface Domino {

  id:string;

  top:number;

  bottom:number;

}



interface DominoTileProps {

  domino: Domino;

  onClick?: () => void;

  disabled?: boolean;

  selected?: boolean;

  size?: "small" | "medium" | "large";

}




export default function DominoTile({

  domino,

  onClick,

  disabled = false,

  selected = false,

  size = "medium"

}: DominoTileProps){



  const sizeClasses = {

    small: "w-8 h-12",

    medium: "w-12 h-20",

    large: "w-16 h-28"

  };



  const dotSize = {

    small: "w-1.5 h-1.5",

    medium: "w-2 h-2",

    large: "w-3 h-3"

  };




  const baseClasses = `

    ${sizeClasses[size]}

    bg-white

    rounded-lg

    shadow-lg

    flex

    flex-col

    items-center

    justify-center

    border-2

    border-gray-300

    transition-all

    duration-200

    text-black

    ${disabled ? 

    "opacity-50 cursor-not-allowed" :

    "cursor-pointer hover:scale-105"}

    

    ${selected ?

    "border-green-500 ring-2 ring-green-500" :

    ""}

  `;




  const renderDots = (

    value:number

  )=>{


    const dotPositions:Record<number,number[]> = {


      0: [],

      1: [4],

      2: [0,8],

      3: [0,4,8],

      4: [0,2,6,8],

      5: [0,2,4,6,8],

      6: [0,2,3,5,6,8]

    };



    const positions =
    dotPositions[value] || [];



    return (

      <div

      className="
      grid
      grid-cols-3
      gap-1
      p-1
      w-full
      h-full
      items-center
      justify-items-center
      "

      >

      {

      Array.from(
        {
          length:9
        }
      )
      .map((_,index)=>(


        <div

        key={index}

        className={`

        ${dotSize[size]}

        rounded-full

        ${positions.includes(index)

        ?

        "bg-black"

        :

        "bg-transparent"

        }

        `}

        />


      ))

      }


      </div>

    );


  };





return (

<button

onClick={onClick}

disabled={disabled}

className={baseClasses}

>



<div

className="
flex-1
flex
items-center
justify-center
border-b
border-gray-300
w-full
"

>


{renderDots(domino.top)}


</div>





<div

className="
flex-1
flex
items-center
justify-center
w-full
"

>


{renderDots(domino.bottom)}


</div>



</button>


);


}
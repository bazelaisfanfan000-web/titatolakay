// src/lib/tttEngine.ts


export type Board = string[][];



// Créer un plateau vide 10x10

export function createEmptyBoard(): Board {

  return Array.from(
    { length: 10 },
    () => Array(10).fill("")
  );

}




// Vérifier les 4 alignés

export function checkWinner(
  board: Board
): string | null {



  const directions = [

    [1,0],   // vertical

    [0,1],   // horizontal

    [1,1],   // diagonal droite

    [1,-1]   // diagonal gauche

  ];




  for(let row = 0; row < 10; row++){


    for(let col = 0; col < 10; col++){



      const symbol = board[row][col];



      if(!symbol)
        continue;




      for(const direction of directions){


        const dr = direction[0];

        const dc = direction[1];



        let count = 1;




        for(
          let i = 1;
          i < 4;
          i++
        ){



          const newRow =
          row + dr * i;


          const newCol =
          col + dc * i;




          if(

            newRow >= 0 &&
            newRow < 10 &&
            newCol >= 0 &&
            newCol < 10 &&
            board[newRow][newCol] === symbol

          ){

            count++;


          }else{

            break;

          }


        }





        if(count >= 4){

          return symbol;

        }


      }


    }


  }




  return null;


}





// Vérifier si le plateau est plein

export function isDraw(
board:Board
){

  for(
    const row of board
  ){

    for(
      const cell of row
    ){

      if(cell === ""){

        return false;

      }

    }

  }


  return true;

}





// Jouer un coup

export function makeMove(

board:Board,

row:number,

col:number,

symbol:string

):Board{



  const newBoard =
  board.map(
    r=>[...r]
  );



  if(newBoard[row][col] !== ""){

    return board;

  }



  newBoard[row][col] = symbol;



  return newBoard;


}
import "./style.css";

import {
  getFen,
} from "./game";

import {
  appState,
} from "./state";

import {
  createBoard,
  renderReserve,
} from "./render";

import {
  initializeInteractions,
} from "./interaction";

document.querySelector("#app").innerHTML = `
  <div class="page">

    <div id="board"
        class="board"></div>

    <div id="reserve"
        class="reserve"></div>

  </div>
`;

const boardElement =
  document.getElementById("board");

appState.fen = getFen();

// initial render
createBoard(
  boardElement,
  appState.fen
);

const reserveElement =
  document.getElementById("reserve");

renderReserve(
  reserveElement,
  appState.reservePieces,
  appState.selectedSource
);

// interactions
initializeInteractions(
  boardElement,
  reserveElement
);
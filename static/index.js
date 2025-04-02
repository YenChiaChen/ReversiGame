/*******************************************************
 * index.js
 *
 * 前端主要邏輯
 ******************************************************/

// 從 HTML 中帶進來的圖片路徑（由 Jinja/Flask 注入）
/* global BLACK_IMG, WHITE_IMG */

/**
 * Socket.io 連線 (注意此處要確保 script 在網頁之後執行)
 */
const socket = io();

// 全域狀態
let currentRoom = null;
let currentMode = null;
let timer = null;
let timeLeft = 30;
let lastState = null;
let previousBoard = null;
let previewFlips = []; // 儲存預覽結果 (格式：[{row, col}, ...])

/*******************************************************
 * DOM 綁定
 ******************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // 取得 DOM 元素
  const btnCreateAI = document.getElementById("btn_create_ai");
  const btnCreatePVP = document.getElementById("btn_create_pvp");
  const btnJoinRoom = document.getElementById("btn_join_room");
  const btnCreateRoom = document.getElementById("btn_create_room"); // 新增：開房間按鈕
  const btnRestart = document.getElementById("btn_restart");
  const btnLeave = document.getElementById("btn_leave");

  // 綁定事件
  btnCreateAI.addEventListener("click", () => createRoom("AI"));
  
  // 點擊 START (PVP) 時，僅展開額外的 PVP 選項（不直接呼叫遊戲開始）
  btnCreatePVP.addEventListener("click", () => {
    const pvpOptions = document.getElementById("pvp_options");
    if (pvpOptions.classList.contains("hidden")) {
      pvpOptions.classList.remove("hidden");
      pvpOptions.classList.add("animate-fadeIn");
    }
  });
  
  // PVP 模式：加入房間與開房間按鈕
  btnJoinRoom.addEventListener("click", joinRoom);
  btnCreateRoom.addEventListener("click", () => createRoom("PVP"));

  btnRestart.addEventListener("click", restartGame);
  btnLeave.addEventListener("click", leaveRoom);
});

/*******************************************************
 * 事件處理與函式
 ******************************************************/

/** 建立新房間 */
function createRoom(mode) {
  fetch("/api/new_room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: mode }),
  })
    .then((response) => response.json())
    .then((data) => {
      // 將房間代碼填入輸入框，方便 joinRoom 使用
      document.getElementById("room_id_input").value = data.room_id;
      // 固定模式為 PVP 時，更新右側玩家顯示為「白色玩家」
      if (mode === "PVP") {
        currentMode = "PVP";
        //document.querySelector("#player_white span").innerText = "WHITE";
        document.getElementById("img_white").src = "/static/black.gif";
        document.getElementById("img_white").alt = "WHITE";
      } else {
        currentMode = mode;
      }
      joinRoom();
    })
    .catch((err) => console.error("Create room error:", err));
}

/** 加入房間 */
function joinRoom() {
  const room_id = document.getElementById("room_id_input").value.trim();
  // 固定 PVP 模式下

  if (!room_id) {
    alert("請輸入房間代碼！");
    return;
  }

  if (!currentMode) {
    currentMode = "PVP";
  }

  socket.emit("join_room", { room_id: room_id, mode: currentMode });
  currentRoom = room_id;
  document.getElementById("room_id_display").innerText = currentRoom;
  document.getElementById("mode_display").innerText = currentMode;

  if (currentMode === "AI") {
    //document.querySelector("#player_white span").innerText = "COM";
    document.getElementById("img_white").src = "/static/com.gif";
    document.getElementById("img_white").alt = "COM";
  } else {
    //document.querySelector("#player_white span").innerText = "WHITE";
    document.getElementById("img_white").src = "/static/black.gif";
    document.getElementById("img_white").alt = "WHITE";
  }

  // 切換到遊戲畫面
  document.getElementById("lobby").style.display = "none";
  document.getElementById("game").style.display = "block";
}

/** 離開房間（直接重新整理） */
function leaveRoom() {
  location.reload();
}

/** 重新開始遊戲 */
function restartGame() {
  socket.emit("restart_game", { room_id: currentRoom });
  document.getElementById("game_over").style.display = "none";
  document.getElementById("game_controls").style.display = "none";
}

/*******************************************************
 * Socket.io 收到的各種事件
 ******************************************************/

/** 房間狀態更新 */
socket.on("room_status", (data) => {
  document.getElementById("players_count").innerText = data.players;
  if (data.players === 2) {
    console.log("遊戲開始...");
  }
});

/** 後端送來的遊戲狀態更新 */
socket.on("state_update", (state) => {
  lastState = state;
  updateBoard(state);

  if (state.game_over) {
    let msg =
      state.winner === "Draw"
        ? "Game Over! It's a Draw!"
        : "Game Over! Winner: " + state.winner;

    document.getElementById("game_over").innerText = msg;
    document.getElementById("game_over").style.display = "block";
    document.getElementById("game_controls").style.display = "block";
    clearInterval(timer);
  } else {
    document.getElementById("game_over").style.display = "none";
    document.getElementById("game_controls").style.display = "none";
  }
});

/** 後端送來的預覽結果（要翻的棋子清單） */
socket.on("preview_result", (data) => {
  previewFlips = data.flips || [];
  updatePreviewDisplay();
});

/*******************************************************
 * 棋盤與計時器控制
 ******************************************************/

/** 更新棋盤 UI */
function updateBoard(state) {
  if (!state) return;
  const board = state.board;
  const validMoves = state.valid_moves || [];
  const table = document.getElementById("board");
  table.innerHTML = "";

  for (let i = 0; i < board.length; i++) {
    const row = document.createElement("tr");
    for (let j = 0; j < board[i].length; j++) {
      const cell = document.createElement("td");

      // 如果是有效移動位置
      if (validMoves.some((m) => m.row === i && m.col === j)) {
        cell.classList.add("valid");
        // 點擊事件：makeMove
        cell.onclick = () => makeMove(i, j);

        // 滑鼠移入請求預覽
        cell.onmouseenter = () => {
          socket.emit("preview_move", { room_id: currentRoom, row: i, col: j });
        };
        // 滑鼠移出清除預覽
        cell.onmouseleave = clearPreview;
      }

      // 若該格已放棋子
      if (board[i][j] !== ".") {
        const img = document.createElement("img");
        img.classList.add("piece");

        if (board[i][j] === "B") {
          img.src = BLACK_IMG;
          img.alt = "Black Piece";
        } else if (board[i][j] === "W") {
          img.src = WHITE_IMG;
          img.alt = "White Piece";
        }

        // 判斷是否要播放翻面動畫
        if (
          previousBoard &&
          previousBoard[i][j] !== board[i][j] &&
          previousBoard[i][j] !== "." &&
          board[i][j] !== "."
        ) {
          img.classList.add("flip");
          img.addEventListener("animationend", () => {
            img.classList.remove("flip");
          });
        }
        cell.appendChild(img);
      }
      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  if(state.current =='B'){
    document.getElementById("current").innerText = 'BLACK'
  }
  else{
    document.getElementById("current").innerText = 'WHITE'
  }

  //document.getElementById("current").innerText = state.current;
  updatePlayerHighlight();
  timeLeft = state.time_left || 30;

  // 更新 previousBoard
  previousBoard = JSON.parse(JSON.stringify(board));

  // 重新啟動計時器
  startTimer();
}

/** 僅更新預覽顯示 */
function updatePreviewDisplay() {
  const table = document.getElementById("board");
  for (let i = 0; i < table.rows.length; i++) {
    for (let j = 0; j < table.rows[i].cells.length; j++) {
      const cell = table.rows[i].cells[j];
      if (previewFlips.some((f) => f.row === i && f.col === j)) {
        cell.classList.add("previewed");
      } else {
        cell.classList.remove("previewed");
      }
    }
  }
}

/** 清除預覽 */
function clearPreview() {
  previewFlips = [];
  updatePreviewDisplay();
}

/** 發送落子指令 */
function makeMove(row, col) {
  socket.emit("make_move", { room_id: currentRoom, row: row, col: col });
  clearPreview();
}

/*******************************************************
 * 計時器控制
 ******************************************************/

/** 開始倒數計時 */
function startTimer() {
  clearInterval(timer);
  const maxTime = 30; // 設定最大倒數時間
  // 初始化秒數與進度條寬度
  document.getElementById("time_left_text").innerText = timeLeft + "秒";
  document.getElementById("progress_bar").style.width =
    (timeLeft / maxTime * 100) + "%";
    
  timer = setInterval(() => {
    timeLeft--;
    if (timeLeft < 0) {
      timeLeft = 0;
    }
    // 更新顯示的秒數與進度條寬度
    document.getElementById("time_left_text").innerText = timeLeft + "秒";
    document.getElementById("progress_bar").style.width =
      (timeLeft / maxTime * 100) + "%";
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      autoMove();
    }
  }, 1000);
}

/** 時間到則自動移動 */
function autoMove() {
  if (
    lastState &&
    Array.isArray(lastState.valid_moves) &&
    lastState.valid_moves.length > 0
  ) {
    const move = lastState.valid_moves[0];
    socket.emit("make_move", {
      room_id: currentRoom,
      row: move.row,
      col: move.col,
    });
  } else {
    console.log("無有效移動，自動下棋失敗。");
  }
}

/*******************************************************
 * 玩家資訊更新：根據目前回合更新圖片與區塊效果
 ******************************************************/
function updatePlayerHighlight() {
  const current = document.getElementById("current").innerText;
  const playerBlack = document.getElementById("player_black");
  const playerWhite = document.getElementById("player_white");
  const imgBlack = document.getElementById("img_black");
  const imgWhite = document.getElementById("img_white");

  // 清除所有特效，並將圖片設為黑白
  playerBlack.classList.remove("scale-110", "shadow-2xl", "bg-yellow-300");
  playerWhite.classList.remove("scale-110", "shadow-2xl", "bg-yellow-300");
  imgBlack.classList.add("grayscale");
  imgWhite.classList.add("grayscale");

  // 當前玩家為黑色玩家
  if (current === "BLACK") {
    playerBlack.classList.add("scale-110");
    imgBlack.classList.remove("grayscale");
  }
  // 當前玩家為白色玩家（或電腦）
  else if (current === "WHITE") {
    playerWhite.classList.add("scale-110");
    imgWhite.classList.remove("grayscale");
  }
}

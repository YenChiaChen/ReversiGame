const socket = io();
let currentRoom = null;
let timer = null;
let timeLeft = 30;
let currentMode = null;

function createRoom(mode) {
  fetch('/api/new_room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: mode })
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById('room_id_input').value = data.room_id;
    document.getElementById('mode_select').value = data.mode;
    joinRoom();
  });
}

function joinRoom() {
  const room_id = document.getElementById('room_id_input').value.trim();
  currentMode = document.getElementById('mode_select').value;
  if (!room_id) {
    alert("Please enter a room ID!");
    return;
  }
  currentRoom = room_id;
  socket.emit('join_room', { room_id: currentRoom, mode: currentMode });
  document.getElementById('room_id_display').innerText = currentRoom;
  document.getElementById('mode_display').innerText = currentMode;
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'block';
}

socket.on('room_status', function(data) {
  document.getElementById('players_count').innerText = data.players;
  if (data.players == 2) {
    console.log("Game is starting...");
  }
});

socket.on('state_update', function(state) {
  updateBoard(state);
  // 如果遊戲結束，顯示遊戲結束訊息與控制項
  if (state.game_over) {
    let msg = "";
    if (state.winner === "Draw") {
      msg = "Game Over! It's a Draw!";
    } else {
      msg = "Game Over! Winner: " + state.winner;
    }
    document.getElementById('game_over').innerText = msg;
    document.getElementById('game_over').style.display = 'block';
    document.getElementById('game_controls').style.display = 'block';
    clearInterval(timer);
  } else {
    // 若遊戲未結束，隱藏結束訊息與控制項
    document.getElementById('game_over').style.display = 'none';
    document.getElementById('game_controls').style.display = 'none';
  }
});

function updateBoard(state) {
  const board = state.board;
  const validMoves = state.valid_moves || [];
  const table = document.getElementById('board');
  table.innerHTML = '';

  for (let i = 0; i < board.length; i++) {
    let row = document.createElement('tr');
    for (let j = 0; j < board[i].length; j++) {
      let cell = document.createElement('td');
      let isValid = validMoves.some(m => m.row === i && m.col === j);
      if (isValid) {
        cell.classList.add('valid');
        cell.innerText = "*";
        cell.onclick = () => makeMove(i, j);
      } else {
        cell.innerText = board[i][j] === "." ? "" : board[i][j];
      }
      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  document.getElementById('current').innerText = state.current;
  timeLeft = state.time_left || 30;
  startTimer();
}

function makeMove(row, col) {
  socket.emit('make_move', { room_id: currentRoom, row: row, col: col });
}

function startTimer() {
  clearInterval(timer);
  document.getElementById('time_left').innerText = timeLeft;
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById('time_left').innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      alert("Time's up! (auto move not implemented)");
      // TODO: 自動下棋
    }
  }, 1000);
}

function restartGame() {
  // 清空目前的遊戲控制區塊並要求後端重啟遊戲
  socket.emit('restart_game', { room_id: currentRoom });
  // 這裡可以加入重啟遊戲後的狀態處理，前端將等待後端廣播更新
  document.getElementById('game_over').style.display = 'none';
  document.getElementById('game_controls').style.display = 'none';
}

function leaveRoom() {
  // 離開房間後返回大廳（你也可以重新整理頁面或進一步實作離線邏輯）
  location.reload();
}
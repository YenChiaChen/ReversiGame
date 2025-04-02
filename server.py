import random
import string
from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO, join_room, leave_room, emit
import eventlet
import reversi_core  # C++ 綁定模組

from flask_cors import CORS


eventlet.monkey_patch()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

# 房間資料格式：包含 players、colors (PVP時：socket_id -> "B"或"W")、game、mode (PVP 或 AI)
rooms = {}

def generate_room_id(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# API: 建立房間，接受 mode 參數（預設 PVP）
@app.route('/api/new_room', methods=['POST'])
def new_room():
    data = request.get_json()
    mode = data.get('mode', 'PVP')  # 'PVP' 或 'AI'
    room_id = generate_room_id()
    rooms[room_id] = {'players': [], 'colors': {}, 'game': None, 'mode': mode}
    return jsonify({'room_id': room_id, 'mode': mode})

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('room_id')
    mode = data.get('mode', 'PVP')
    if not room_id:
        emit('error', {'msg': 'No room_id provided'})
        return

    # 如果房間不存在就建立新房間，並記錄模式
    if room_id not in rooms:
        rooms[room_id] = {'players': [], 'colors': {}, 'game': None, 'mode': mode}

    join_room(room_id)
    rooms[room_id]['players'].append(request.sid)
    print(f"Socket {request.sid} joined room {room_id}")

    # 若 PVP 模式，依照加入順序分配顏色
    if rooms[room_id]['mode'] == "PVP":
        if len(rooms[room_id]['players']) == 1:
            rooms[room_id]['colors'][request.sid] = "B"  # 第一位為黑棋
        elif len(rooms[room_id]['players']) == 2:
            rooms[room_id]['colors'][request.sid] = "W"  # 第二位為白棋

    emit('room_status', {'players': len(rooms[room_id]['players']),
                           'mode': rooms[room_id]['mode']}, room=room_id)

    # 如果房間為 AI 模式，只需一位玩家就開始遊戲
    if rooms[room_id]['mode'] == "AI":
        if len(rooms[room_id]['players']) >= 1 and rooms[room_id]['game'] is None:
            game = reversi_core.Game()
            game.start()
            rooms[room_id]['game'] = game
            state = reversi_core.get_state(game)
            emit('state_update', state, room=room_id)
    else:
        # PVP 模式：當房間人數達到兩位時開始遊戲
        if len(rooms[room_id]['players']) == 2:
            game = reversi_core.Game()
            game.start()
            rooms[room_id]['game'] = game
            state = reversi_core.get_state(game)
            emit('state_update', state, room=room_id)

@socketio.on('make_move')
def handle_make_move(data):
    room_id = data.get('room_id')
    row = data.get('row')
    col = data.get('col')

    if room_id not in rooms or not rooms[room_id]['game']:
        emit('error', {'msg': 'Game not started or room not found'})
        return

    game = rooms[room_id]['game']

    # 檢查 PVP 模式下是否由正確顏色的玩家下棋
    if rooms[room_id]['mode'] == "PVP":
        # 透過 get_state 得到目前回合玩家顏色 (字串 "B" 或 "W")
        current_state = reversi_core.get_state(game)
        current_color = current_state.get("current")
        player_color = rooms[room_id]['colors'].get(request.sid)
        if player_color != current_color:
            emit('error', {'msg': 'Not your turn!'}, room=request.sid)
            return

    # 玩家下棋
    if game.play_turn(int(row), int(col)):
        state = reversi_core.get_state(game)
        
        # 檢查遊戲是否結束
        if game.is_game_over():
            # 使用 C++ 遊戲邏輯取得勝方 (回傳值為 Board::Cell)
            winner = game.get_board().get_winner()
            if winner == reversi_core.Cell.Black:
                state['winner'] = "B"
            elif winner == reversi_core.Cell.White:
                state['winner'] = "W"
            else:
                state['winner'] = "Draw"
            state['game_over'] = True
        else:
            state['game_over'] = False

        emit('state_update', state, room=room_id)

        # AI 模式：若非遊戲結束且輪到 AI (此處假設玩家永遠是黑棋，AI 為白棋)
        if rooms[room_id]['mode'] == "AI" and not state.get('game_over', False):
            if game.current_player() == reversi_core.Cell.White:
                eventlet.sleep(3)
                game.auto_move()
                state = reversi_core.get_state(game)
                if game.is_game_over():
                    winner = game.get_board().get_winner()
                    if winner == reversi_core.Cell.Black:
                        state['winner'] = "B"
                    elif winner == reversi_core.Cell.White:
                        state['winner'] = "W"
                    else:
                        state['winner'] = "Draw"
                    state['game_over'] = True
                else:
                    state['game_over'] = False
                emit('state_update', state, room=room_id)
    else:
        emit('error', {'msg': 'Invalid move'}, room=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    for room_id, room in list(rooms.items()):
        if request.sid in room['players']:
            room['players'].remove(request.sid)
            # 若是 PVP 模式，移除對應的顏色配置
            if room['mode'] == "PVP":
                room['colors'].pop(request.sid, None)
            leave_room(room_id)
            emit('room_status', {'players': len(room['players'])}, room=room_id)
            if len(room['players']) == 0:
                del rooms[room_id]

@socketio.on('preview_move')
def handle_preview_move(data):
    room_id = data.get('room_id')
    row = data.get('row')
    col = data.get('col')
    
    if room_id not in rooms or not rooms[room_id]['game']:
        emit('error', {'msg': 'Game not started or room not found'}, room=request.sid)
        return
    
    game = rooms[room_id]['game']
    
    # 確認該玩家是否為當前輪到的玩家
    current_state = reversi_core.get_state(game)
    current_color = current_state.get("current")
    player_color = rooms[room_id]['colors'].get(request.sid)
    
    # 如果輪到的玩家不是當前玩家，則不允許預覽
    if player_color != current_color:
        emit('error', {'msg': 'Not your turn!'}, room=request.sid)
        return

    try:
        flips = reversi_core.preview_move(game, int(row), int(col))
        emit('preview_result', {'row': row, 'col': col, 'flips': flips}, room=request.sid)
    except Exception as e:
        emit('error', {'msg': str(e)}, room=request.sid)



if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=3001, debug=True, use_reloader=False)


#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "Game.h"  // 包含 Board.h 與 Game.h

namespace py = pybind11;

// 輔助函式：取得遊戲狀態並轉換為 Python 字典
py::dict get_state(reversi::Game &game) {
    py::dict state;
    const reversi::Board &board = game.getBoard();
    py::list board_list;
    for (int i = 0; i < reversi::Board::SIZE; ++i) {
        py::list row;
        for (int j = 0; j < reversi::Board::SIZE; ++j) {
            reversi::Board::Cell cell = board.getCell(i, j);
            if (cell == reversi::Board::Cell::Empty)
                row.append(".");
            else if (cell == reversi::Board::Cell::Black)
                row.append("B");
            else if (cell == reversi::Board::Cell::White)
                row.append("W");
        }
        board_list.append(row);
    }
    state["board"] = board_list;

    reversi::Board::Cell cp = game.currentPlayer();
    state["current"] = (cp == reversi::Board::Cell::Black) ? "B" : "W";

    // 加入合法落子點
    py::list valid_moves;
    for (const auto& move : board.getValidMoves(cp)) {
        py::dict mv;
        mv["row"] = move.first;
        mv["col"] = move.second;
        valid_moves.append(mv);
    }
    state["valid_moves"] = valid_moves;

    // 時間剩餘（暫時固定為 30 秒，未來可加強從 Game 中計算）
    state["time_left"] = 30;

    return state;
}

py::list preview_move(reversi::Game &game, int x, int y) {
    py::list flips;
    // 取得目前玩家與棋盤
    reversi::Board::Cell player = game.currentPlayer();
    const reversi::Board &board = game.getBoard();

    // 定義一個本地 lambda 來檢查邊界
    auto in_bounds = [](int a, int b) -> bool {
        return a >= 0 && a < reversi::Board::SIZE && b >= 0 && b < reversi::Board::SIZE;
    };

    // 若不是合法走法，直接回傳空列表
    if (!board.isValidMove(x, y, player)) {
        return flips;
    }

    int dx[] = {-1, -1, -1, 0, 0, 1, 1, 1};
    int dy[] = {-1, 0, 1, -1, 1, -1, 0, 1};
    reversi::Board::Cell opponent = (player == reversi::Board::Cell::Black)
                                     ? reversi::Board::Cell::White
                                     : reversi::Board::Cell::Black;

    // 模擬各個方向
    for (int dir = 0; dir < 8; ++dir) {
        int nx = x + dx[dir], ny = y + dy[dir];
        std::vector<std::pair<int, int>> path;
        while (in_bounds(nx, ny) && board.getCell(nx, ny) == opponent) {
            path.push_back({nx, ny});
            nx += dx[dir];
            ny += dy[dir];
        }
        if (!path.empty() && in_bounds(nx, ny) && board.getCell(nx, ny) == player) {
            for (auto &pos : path) {
                py::dict d;
                d["row"] = pos.first;
                d["col"] = pos.second;
                flips.append(d);
            }
        }
    }
    return flips;
}



PYBIND11_MODULE(reversi_core, m) {
    m.doc() = "Reversi Game Core module";

    // 綁定 Board 類別與 Cell 列舉
    py::class_<reversi::Board>(m, "Board")
        .def("get_cell", &reversi::Board::getCell)
        .def("get_valid_moves", &reversi::Board::getValidMoves)
        .def("get_winner", &reversi::Board::getWinner)
        ;

    py::enum_<reversi::Board::Cell>(m, "Cell")
        .value("Empty", reversi::Board::Cell::Empty)
        .value("Black", reversi::Board::Cell::Black)
        .value("White", reversi::Board::Cell::White)
        .export_values();

    // 綁定 Game 類別
    py::class_<reversi::Game>(m, "Game")
        .def(py::init<>())
        .def("start", &reversi::Game::start)
        .def("play_turn", &reversi::Game::playTurn)
        .def("auto_move", &reversi::Game::autoMove)
        .def("next_player", &reversi::Game::nextPlayer)
        .def("is_game_over", &reversi::Game::isGameOver)
        .def("current_player", &reversi::Game::currentPlayer)
        .def("get_board", &reversi::Game::getBoard, py::return_value_policy::reference_internal)
        ;

    // 綁定輔助函式，回傳完整狀態字典
    m.def("get_state", &get_state, "Return game state as a dict");
    m.def("preview_move", &preview_move, "Return flips preview for a move");
}

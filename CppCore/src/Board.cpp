#include "Board.h"
#include <stdexcept>

namespace reversi {

Board::Board() {
    reset();
}

void Board::reset() {
    for (int i = 0; i < SIZE; ++i)
        for (int j = 0; j < SIZE; ++j)
            board[i][j] = Cell::Empty;
    // 初始化中心四格
    board[SIZE/2 - 1][SIZE/2 - 1] = Cell::White;
    board[SIZE/2 - 1][SIZE/2]     = Cell::Black;
    board[SIZE/2][SIZE/2 - 1]     = Cell::Black;
    board[SIZE/2][SIZE/2]         = Cell::White;
}

bool Board::inBounds(int x, int y) const {
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

bool Board::isValidMove(int x, int y, Cell player) const {
    if (!inBounds(x, y) || board[x][y] != Cell::Empty)
        return false;

    int dx[] = {-1, -1, -1, 0, 0, 1, 1, 1};
    int dy[] = {-1, 0, 1, -1, 1, -1, 0, 1};

    Cell opponent = (player == Cell::Black) ? Cell::White : Cell::Black;

    for (int dir = 0; dir < 8; ++dir) {
        int nx = x + dx[dir], ny = y + dy[dir];
        bool foundOpponent = false;
        while (inBounds(nx, ny) && board[nx][ny] == opponent) {
            foundOpponent = true;
            nx += dx[dir];
            ny += dy[dir];
        }
        if (foundOpponent && inBounds(nx, ny) && board[nx][ny] == player)
            return true;
    }
    return false;
}

bool Board::makeMove(int x, int y, Cell player) {
    if (!isValidMove(x, y, player))
        return false;
    board[x][y] = player;
    flipDiscs(x, y, player);
    return true;
}

void Board::flipDiscs(int x, int y, Cell player) {
    int dx[] = {-1, -1, -1, 0, 0, 1, 1, 1};
    int dy[] = {-1, 0, 1, -1, 1, -1, 0, 1};

    Cell opponent = (player == Cell::Black) ? Cell::White : Cell::Black;

    for (int dir = 0; dir < 8; ++dir) {
        int nx = x + dx[dir], ny = y + dy[dir];
        std::vector<std::pair<int, int>> toFlip;
        while (inBounds(nx, ny) && board[nx][ny] == opponent) {
            toFlip.push_back({nx, ny});
            nx += dx[dir];
            ny += dy[dir];
        }
        if (inBounds(nx, ny) && board[nx][ny] == player) {
            for (auto& pos : toFlip)
                board[pos.first][pos.second] = player;
        }
    }
}

std::vector<std::pair<int, int>> Board::getValidMoves(Cell player) const {
    std::vector<std::pair<int, int>> moves;
    for (int i = 0; i < SIZE; ++i)
        for (int j = 0; j < SIZE; ++j)
            if (isValidMove(i, j, player))
                moves.push_back({i, j});
    return moves;
}

Board::Cell Board::getWinner() const {
    int countBlack = 0, countWhite = 0;
    for (int i = 0; i < SIZE; ++i)
        for (int j = 0; j < SIZE; ++j) {
            if (board[i][j] == Cell::Black)
                ++countBlack;
            else if (board[i][j] == Cell::White)
                ++countWhite;
        }
    if (countBlack > countWhite)
        return Cell::Black;
    else if (countWhite > countBlack)
        return Cell::White;
    else
        return Cell::Empty; // 平局以 Empty 表示
}

Board::Cell Board::getCell(int x, int y) const {
    if (!inBounds(x, y))
        throw std::out_of_range("Index out of bounds");
    return board[x][y];
}

} // namespace reversi

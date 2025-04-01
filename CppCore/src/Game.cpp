#include "Game.h"
#include <random>
#include <chrono>

namespace reversi {

Game::Game() : current(Board::Cell::Black), turnTimeLimitSeconds(30) {
    board.reset();
    turnStartTime = std::chrono::steady_clock::now();
}

void Game::start() {
    board.reset();
    current = Board::Cell::Black;
    turnStartTime = std::chrono::steady_clock::now();
}

bool Game::playTurn(int x, int y) {
    if (board.makeMove(x, y, current)) {
        nextPlayer();
        turnStartTime = std::chrono::steady_clock::now();
        return true;
    }
    return false;
}

void Game::autoMove() {
    auto validMoves = board.getValidMoves(current);
    if (!validMoves.empty()) {
        // 簡單隨機選擇一個合法走法
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(0, validMoves.size() - 1);
        auto move = validMoves[dis(gen)];
        board.makeMove(move.first, move.second, current);
    }
    nextPlayer();
    turnStartTime = std::chrono::steady_clock::now();
}

void Game::nextPlayer() {
    current = (current == Board::Cell::Black) ? Board::Cell::White : Board::Cell::Black;
}

bool Game::isGameOver() const {
    // 當雙方皆無合法走法時遊戲結束
    return board.getValidMoves(Board::Cell::Black).empty() &&
           board.getValidMoves(Board::Cell::White).empty();
}

Board::Cell Game::currentPlayer() const {
    return current;
}

const Board& Game::getBoard() const {
    return board;
}

} // namespace reversi

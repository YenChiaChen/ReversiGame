#ifndef REVERSI_GAME_H
#define REVERSI_GAME_H

#include "Board.h"
#include <chrono>

namespace reversi {

class Game {
public:
    Game();
    void start();
    bool playTurn(int x, int y);
    void autoMove();                       // 當超時時自動下棋
    void nextPlayer();
    bool isGameOver() const;
    Board::Cell currentPlayer() const;
    const Board& getBoard() const;

private:
    Board board;
    Board::Cell current;
    int turnTimeLimitSeconds;
    std::chrono::time_point<std::chrono::steady_clock> turnStartTime;
};

} // namespace reversi

#endif // REVERSI_GAME_H

#ifndef REVERSI_BOARD_H
#define REVERSI_BOARD_H

#include <vector>
#include <utility>

namespace reversi {

class Board {
public:
    static const int SIZE = 8;
    enum class Cell { Empty, Black, White };

    Board();
    bool isValidMove(int x, int y, Cell player) const;
    bool makeMove(int x, int y, Cell player);
    std::vector<std::pair<int, int>> getValidMoves(Cell player) const;
    Cell getWinner() const;
    Cell getCell(int x, int y) const;
    void reset();

private:
    Cell board[SIZE][SIZE];
    void flipDiscs(int x, int y, Cell player);
    bool inBounds(int x, int y) const;
};

} // namespace reversi

#endif // REVERSI_BOARD_H

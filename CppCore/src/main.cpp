#include "Game.h"
#include <iostream>
#include <string>
#include <future>
#include <chrono>
#include <vector>
#include <sstream>

using namespace reversi;

char cellToChar(Board::Cell cell) {
    switch(cell) {
        case Board::Cell::Empty: return '.';
        case Board::Cell::Black: return 'B';
        case Board::Cell::White: return 'W';
    }
    return '?';
}

void printBoard(const Board &board) {
    std::cout << "  0 1 2 3 4 5 6 7\n";
    for (int i = 0; i < Board::SIZE; ++i) {
        std::cout << i << " ";
        for (int j = 0; j < Board::SIZE; ++j) {
            std::cout << cellToChar(board.getCell(i, j)) << " ";
        }
        std::cout << "\n";
    }
}

void printValidMoves(const Board &board, Board::Cell player) {
    auto moves = board.getValidMoves(player);
    std::cout << "Valid moves for player " 
              << (player == Board::Cell::Black ? "Black (B)" : "White (W)") 
              << ": ";
    for (const auto &move : moves) {
        std::cout << "(" << move.first << ", " << move.second << ") ";
    }
    std::cout << "\n";
}

int main() {
    Game game;
    game.start();

    while (!game.isGameOver()) {
        // 顯示棋盤與合法走法
        printBoard(game.getBoard());
        printValidMoves(game.getBoard(), game.currentPlayer());
        std::cout << "Current Player: " 
                  << (game.currentPlayer() == Board::Cell::Black ? "Black (B)" : "White (W)") 
                  << "\n";

        std::cout << "Enter move (row col) within 30 seconds: " << std::endl;
        
        // 使用 std::async 非同步等待輸入
        auto inputFuture = std::async(std::launch::async, [](){
            std::string line;
            std::getline(std::cin, line);
            return line;
        });
        
        bool moveMade = false;
        int remainingTime = 30;
        std::string inputLine;
        
        // 倒數計時迴圈，每秒檢查一次輸入
        while (remainingTime > 0) {
            if (inputFuture.wait_for(std::chrono::seconds(1)) == std::future_status::ready) {
                inputLine = inputFuture.get();
                moveMade = true;
                break;
            }
            remainingTime--;
            std::cout << "Time left: " << remainingTime << " seconds\r" << std::flush;
        }
        
        std::cout << std::endl; // 倒數結束後換行

        if (!moveMade) {
            std::cout << "Time is up! Executing auto move..." << std::endl;
            game.autoMove();
        } else {
            if (inputLine == "a") {
                game.autoMove();
            } else {
                std::istringstream iss(inputLine);
                int row, col;
                if (!(iss >> row >> col)) {
                    std::cout << "Invalid input. Auto move executed." << std::endl;
                    game.autoMove();
                } else {
                    if (!game.playTurn(row, col)) {
                        std::cout << "Invalid move. Auto move executed." << std::endl;
                        game.autoMove();
                    }
                }
            }
        }
    }
    
    printBoard(game.getBoard());
    Board::Cell winner = game.getBoard().getWinner();
    if (winner == Board::Cell::Black)
        std::cout << "Black wins!\n";
    else if (winner == Board::Cell::White)
        std::cout << "White wins!\n";
    else
        std::cout << "It's a draw!\n";
        
    return 0;
}

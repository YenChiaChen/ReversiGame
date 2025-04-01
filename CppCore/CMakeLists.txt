cmake_minimum_required(VERSION 3.14)
project(ReversiGameCore)

# 建議使用 C++14 以上
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 取得 pybind11 的 cmake 模組路徑
execute_process(
    COMMAND python3 -m pybind11 --cmakedir
    OUTPUT_VARIABLE PYBIND11_CMAKE_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
)

list(APPEND CMAKE_PREFIX_PATH ${PYBIND11_CMAKE_DIR})

# 尋找 pybind11
find_package(pybind11 REQUIRED)

# 包含 header 檔
include_directories(include)

# 設定輸出目錄為目前專案資料夾（方便 Python 匯入）
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR})

# 所有 C++ 源碼檔案
set(SOURCES
    src/Board.cpp
    src/Game.cpp
    bindings.cpp
)

# 建立 pybind11 模組
pybind11_add_module(reversi_core ${SOURCES})

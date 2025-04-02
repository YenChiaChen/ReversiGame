# Reversi Game Project

This repository implements a multiplayer Reversi game with both PVP and AI modes. The game core is written in C++ and exposed to Python via pybind11. The backend is built with Flask and Flask-SocketIO, while the frontend is a web interface served on port 3000.

## Project Structure

```
ReversiGame/
├── CppCore/                # C++ game logic core and pybind11 bindings
│   ├── include/            # Header files (e.g., Board.h, Game.h)
│   ├── src/                # Source files (e.g., Board.cpp, Game.cpp)
│   ├── bindings.cpp        # pybind11 bindings for C++ core
│   └── CMakeLists.txt      # CMake build script for C++ core
├── server.py               # Flask backend server
├── templates/              # HTML templates for the web GUI
│   └── index.html
├── static/                 # Static files (e.g., images for pieces)
└── README.md               # This file
```

## C++ Compile

To compile the C++ game core and create the Python module, follow these steps:

1. Open a terminal and navigate to the `CppCore` directory:
   ```bash
   cd CppCore
   ```

2. Create a build directory and change into it:
   ```bash
   mkdir build && cd build
   ```

3. Run CMake to configure the project. **Note:** There must be a space between `cmake` and `..`
   ```bash
   cmake ..
   ```

4. Build the project using make:
   ```bash
   make
   ```

> **Note:** The build process will generate a shared library (e.g., `reversi_core.so` on Linux, `reversi_core.pyd` on Windows, or `reversi_core.dylib` on macOS).  
> Copy this shared library to the root folder or ensure it is accessible to your Python environment so that `server.py` can import the module.

## Run Game

After compiling the C++ module and setting up the Python backend:

1. Ensure that the compiled shared library (e.g., `reversi_core.so`) is in the root folder or included in your `PYTHONPATH`.

2. Start the Flask server:
   ```bash
   python server.py
   ```

3. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```
   The GUI will be live, and you can create or join a room to play the game.

## Additional Notes

- **Dependencies:**
  - C++: CMake (>=3.10), a C++ compiler supporting C++11, and pybind11.
  - Python: Flask, Flask-SocketIO, eventlet.
  - Frontend: Socket.IO client and Tailwind CSS for styling (loaded via CDN).

- **Environment Setup:**
  - Ensure you have installed pybind11. You can install it via pip or include it as a submodule.
  - For Python dependencies, run:
    ```bash
    pip install flask flask-socketio eventlet
    ```

- **Troubleshooting:**
  - If the Flask server cannot find the C++ module, verify that the shared library is in the correct location or update your `PYTHONPATH` accordingly.
  - The `cmake ..` command must have a space between `cmake` and `..`.

## License

This project is licensed under the MIT License.

# 3.8 is the minimal version that supports c++17
cmake_minimum_required(VERSION 3.8)
set(CMAKE_CXX_STANDARD 17)

project(nineveh VERSION 0.0.1)
add_custom_command(
    OUTPUT ${PROJECT_SOURCE_DIR}/nineveh/version/version.cc
    COMMAND ${CMAKE_COMMAND} -DPROJECT_SOURCE_DIR=${PROJECT_SOURCE_DIR} -DPROJECT_VERSION=${PROJECT_VERSION} -P ${PROJECT_SOURCE_DIR}/nineveh/version/version.cc.cmake
    DEPENDS ${PROJECT_SOURCE_DIR}/nineveh/version/version.cc.cmake ${PROJECT_SOURCE_DIR}/nineveh/version/version.cc.in
)

set(NINEVEH_SRC nineveh/main.cc nineveh/version/version.cc)
add_executable(nineveh ${NINEVEH_SRC})

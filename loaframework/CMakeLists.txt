# 3.8 is the minimal version that supports c++17
# 3.12 is PhysX's requirement
# 3.15 is CMAKE_MSVC_RUNTIME_LIBRARY requirement
cmake_minimum_required(VERSION 3.15)
set(CMAKE_CXX_STANDARD 17) # We need aligned new feature
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>$<$<NOT:$<CONFIG:Debug>>:DLL>") # MTd MD
project(loaframework VERSION 0.0.1)

# Platform Specificatioin
if(MSVC)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /source-charset:utf-8 /W3")
else()
    message(FATAL_ERROR "This project is currently windows only")
endif()

# Global Include
include_directories("${PROJECT_SOURCE_DIR}")

# include_directories("${PROJECT_SOURCE_DIR}/include")
# link_directories("${PROJECT_SOURCE_DIR}/lib")

# Version String
add_custom_command(
    OUTPUT ${PROJECT_SOURCE_DIR}/src/version/version.cc
    COMMAND ${CMAKE_COMMAND} -DPROJECT_SOURCE_DIR=${PROJECT_SOURCE_DIR} -DPROJECT_VERSION=${PROJECT_VERSION} -P ${PROJECT_SOURCE_DIR}/src/version/version.cc.cmake
    DEPENDS ${PROJECT_SOURCE_DIR}/src/version/version.cc.cmake ${PROJECT_SOURCE_DIR}/src/version/version.cc.in
)

# Source Files
set(LOA_SRC
    src/version/version.cc
    src/core/ability_stone.cc
    src/core/upgrade_calc.cc
)
list(APPEND LOA_SRC src/loaframework.cc)

# Link Libraries
set(LOA_LINK d3d11)

add_library(loaframework_static STATIC ${LOA_SRC})
target_compile_definitions(loaframework_static PUBLIC -DWIN32_LEAN_AND_MEAN -DNOMINMAX)
target_compile_definitions(loaframework_static PUBLIC -DLOA_STATIC_LIB)
target_link_libraries(loaframework_static PRIVATE ${LOA_LINK})

add_library(loaframework SHARED ${LOA_SRC})
target_compile_definitions(loaframework PUBLIC -DWIN32_LEAN_AND_MEAN -DNOMINMAX)
target_compile_definitions(loaframework PUBLIC -DLOA_SHARE_LIB)
target_compile_definitions(loaframework PRIVATE -DLOA_BUILD_LIB)
target_link_libraries(loaframework PRIVATE ${LOA_LINK})

add_executable(loa_tool main.cc)
target_link_libraries(loa_tool PRIVATE loaframework$<$<CONFIG:Debug>:_static>)

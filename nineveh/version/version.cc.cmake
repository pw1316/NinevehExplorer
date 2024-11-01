if(NOT PROJECT_SOURCE_DIR OR NOT PROJECT_VERSION)
    message(FATAL_ERROR "Variable PROJECT_SOURCE_DIR and PROJECT_VERSION must be specified!!!")
endif()

find_package(Git)

if(GIT_FOUND)
    execute_process(COMMAND git -C ${PROJECT_SOURCE_DIR} log --pretty=format:${PROJECT_VERSION}-%h -n 1 OUTPUT_VARIABLE NINEVEH_VERSION_STR)
    execute_process(COMMAND git -C ${PROJECT_SOURCE_DIR} log -1 OUTPUT_VARIABLE NINEVEH_COMMIT_STR)
else()
    set(NINEVEH_VERSION_STR ${PROJECT_VERSION})
    set(NINEVEH_COMMIT_STR "[build without git]")
endif()

string(REPLACE "\n" "\\n" NINEVEH_COMMIT_STR ${NINEVEH_COMMIT_STR})
configure_file(${PROJECT_SOURCE_DIR}/nineveh/version/version.cc.in ${PROJECT_SOURCE_DIR}/nineveh/version/version.cc @ONLY NEWLINE_STYLE UNIX)

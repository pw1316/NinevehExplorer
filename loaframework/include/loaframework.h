#ifndef __LOAFRAMEWORK_H__
#define __LOAFRAMEWORK_H__

#ifdef LOA_STATIC_LIB
#define LOA_API extern "C" extern
#else
#ifdef LOA_BUILD_LIB
#define LOA_API extern "C" __declspec(dllexport)
#else
#define LOA_API extern "C" __declspec(dllimport)
#endif
#endif

LOA_API void loa_version();

#endif

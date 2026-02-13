#ifndef __CORE_ABILITY_STONE_H__
#define __CORE_ABILITY_STONE_H__

namespace loaframework::core {
class AbilityStone {
   public:
    AbilityStone();
};
}  // namespace loaframework::core

#endif

// #include <algorithm>
// #include <iostream>
// #include <map>

// constexpr int kMaxRate = 75;
// constexpr int kMinRate = 25;
// constexpr int kDeltaRate = 10;

// constexpr int kPosMin = 7;    // 全都要满足
// constexpr int kPosMax = 7;    // 至少一条要满足
// constexpr int kMinusMax = 5;  // 负面需要小于这个值

// static std::map<unsigned int, double> dp_result;

// unsigned int encode_key(int x, int y, int z, int a, int b, int c, int r) {
//     auto result = 0;
//     result = (result << 4) | (x & 0x0F);
//     result = (result << 4) | (a & 0x0F);
//     result = (result << 4) | (y & 0x0F);
//     result = (result << 4) | (b & 0x0F);
//     result = (result << 4) | (z & 0x0F);
//     result = (result << 4) | (c & 0x0F);
//     result = (result << 8) | (r & 0xFF);
//     return result;
// }

// template <class T>
// T _my_clamp(T curVal, T minVal, T maxVal) {
//     return std::max(std::min(maxVal, curVal), minVal);
// }

// int _next_r(int r, bool isSucc) {
//     auto delta = isSucc ? -kDeltaRate : kDeltaRate;
//     return _my_clamp(r + delta, kMinRate, kMaxRate);
// }

// double _step(int x, int y, int z, int a, int b, int c, int r);

// static double _step_1(int x, int y, int z, int a, int b, int c, int r) {
//     auto succRate = _step(x - 1, y, z, a + 1, b, c, _next_r(r, true));
//     auto failRate = _step(x - 1, y, z, a, b, c, _next_r(r, false));
//     auto rr = r / 100.0;
//     return succRate * rr + failRate * (1.0 - rr);
// }

// static double _step_2(int x, int y, int z, int a, int b, int c, int r) {
//     auto succRate = _step(x, y - 1, z, a, b + 1, c, _next_r(r, true));
//     auto failRate = _step(x, y - 1, z, a, b, c, _next_r(r, false));
//     auto rr = r / 100.0;
//     return succRate * rr + failRate * (1.0 - rr);
// }

// static double _step_3(int x, int y, int z, int a, int b, int c, int r) {
//     auto succRate = _step(x, y, z - 1, a, b, c + 1, _next_r(r, true));
//     auto failRate = _step(x, y, z - 1, a, b, c, _next_r(r, false));
//     auto rr = r / 100.0;
//     return succRate * rr + failRate * (1.0 - rr);
// }

// static double _step(int x, int y, int z, int a, int b, int c, int r) {
//     // 不要负面
//     if (c >= kMinusMax) {
//         return 0.0f;
//     }

//     if (a >= kPosMin && b >= kPosMin && (a >= kPosMax || b >= kPosMax)) {
//         return 1.0;
//     }

//     // 第三条是负面不会增加点数，前两条点完就再也不会涨了
//     if (x <= 0 && y <= 0) {
//         return 0.0f;
//     }

//     auto key = encode_key(x, y, z, a, b, c, r);
//     if (dp_result.count(key)) {
//         return dp_result[key];
//     }

//     auto result = 0.0;
//     if (x > 0) {
//         auto finalRate = _step_1(x, y, z, a, b, c, r);
//         result = std::max(finalRate, result);
//     }
//     if (y > 0) {
//         auto finalRate = _step_2(x, y, z, a, b, c, r);
//         result = std::max(finalRate, result);
//     }
//     if (z > 0) {
//         auto finalRate = _step_3(x, y, z, a, b, c, r);
//         result = std::max(finalRate, result);
//     }
//     dp_result[key] = result;
//     return result;
// }

// int main() {
//     auto x = 10;
//     auto y = 10;
//     auto z = 10;
//     auto a = 0;
//     auto b = 0;
//     auto c = 0;
//     auto r = 75;
//     _step(x, y, z, a, b, c, r);
//     while (1) {
//         std::cout << "Cur Progress:";
//         std::cout << "(" << a << "/" << 10 - x << ")";
//         std::cout << "(" << b << "/" << 10 - y << ")";
//         std::cout << "(" << c << "/" << 10 - z << ")";
//         std::cout << "(" << r << "%)" << std::endl;
//         if (x > 0) {
//             auto finalRate = _step_1(x, y, z, a, b, c, r);
//             std::cout << " Option 1: " << finalRate << std::endl;
//         }
//         if (y > 0) {
//             auto finalRate = _step_2(x, y, z, a, b, c, r);
//             std::cout << " Option 2: " << finalRate << std::endl;
//         }
//         if (z > 0) {
//             auto finalRate = _step_3(x, y, z, a, b, c, r);
//             std::cout << " Option 3: " << finalRate << std::endl;
//         }
//         auto option = 0;
//         auto isSucc = 0;
//         std::cout << "Now input selection and result: ";
//         std::cin >> option >> isSucc;
//         switch (option) {
//             case 1:
//                 --x;
//                 a += isSucc ? 1 : 0;
//                 r = _next_r(r, isSucc);
//                 break;
//             case 2:
//                 --y;
//                 b += isSucc ? 1 : 0;
//                 r = _next_r(r, isSucc);
//                 break;
//             case 3:
//                 --z;
//                 c += isSucc ? 1 : 0;
//                 r = _next_r(r, isSucc);
//                 break;
//             default:
//                 std::cout << "Invalid input!!!" << std::endl;
//         }
//     }
// }

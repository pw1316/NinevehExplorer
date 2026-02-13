// #include <iostream>
// #include <random>
// #include <string>

// constexpr int kTarget = 100;
// constexpr int kSpecial = 6;

// constexpr int kWeeklyRed = 600 * 10 / 5 / 5 + 400 * 5 / 5 + 200 * 10;
// constexpr int kWeeklyBlue = 600 * 30 / 5 / 5 + 400 * 15 / 5 + 200 * 30;
// constexpr int kWeeklyStone = 30 * 10 / 5 / 5 + 20 * 3 / 5 + 10 * 10;
// constexpr int kWeeklyDog = 1500 * 30;
// constexpr int kWeeklyPopcorn = 10 * 10 / 5 / 5 + 10 * 10 / 5 + 10 * 10;

// constexpr int kOneHitWpRed = 500;     // 800
// constexpr int kOneHitWpStone = 15;    // 18
// constexpr int kOneHitWpDog = 7200;    // 13600
// constexpr int kOneHitWpPopcorn = 15;  // 16

// constexpr int kOneHitAmBlue = 475;   // 650
// constexpr int kOneHitAmStone = 11;   // 14
// constexpr int kOneHitAmDog = 4400;   // 8800
// constexpr int kOneHitAmPopcorn = 9;  // 10

// static std::discrete_distribution<int> exp_dist({80, 15, 5});
// static std::discrete_distribution<int> ex_exp_dist({50, 30, 20});
// static std::discrete_distribution<int> special_dist({1, 1, 1, 1});

// class UpgradeMaterial {
//    public:
//     UpgradeMaterial(const std::string& name, int reward, int cost)
//         : name_(name), weekly_reward_(reward), one_hit_cost_(cost) {}
//     void Print(double need_count) {
//         std::cout << name_;
//         std::cout << " 周产出: " << weekly_reward_;
//         std::cout << " 单次消耗: " << one_hit_cost_;
//         int need_weeks = ceil(need_count * one_hit_cost_ / weekly_reward_);
//         std::cout << " 点一件要几周: " << need_weeks;
//         std::cout << "\n";
//     }

//    private:
//     std::string name_;
//     int weekly_reward_;
//     int one_hit_cost_;
// };

// int run_single_test(std::mt19937& rng, bool useNormalUp, bool useSpecialUp) {
//     auto exp = 0;
//     auto free_flag = false;
//     auto count = 0;
//     auto special_exp = 0;
//     while (exp < kTarget) {
//         if (free_flag) {
//             free_flag = false;
//         } else {
//             ++count;
//         }

//         // normal exp
//         auto add_exp = 0;
//         // special effect
//         if (special_exp >= kSpecial) {
//             add_exp = (useSpecialUp ? ex_exp_dist(rng) : exp_dist(rng)) + 1;
//             auto special_index = special_dist(rng);
//             switch (special_index) {
//                 case 0:
//                     // 5 times
//                     add_exp = add_exp * 5;
//                     special_exp = 0;
//                     break;
//                 case 1:
//                     // 3 times
//                     add_exp = add_exp * 3;
//                     special_exp = 0;
//                     break;
//                 case 2:
//                     // add 3 exp, keep special exp
//                     add_exp = add_exp + 3;
//                     break;
//                 case 3:
//                     // add 1 exp, next free
//                     add_exp = add_exp + 1;
//                     free_flag = true;
//                     special_exp = 0;
//                     break;
//             }
//         } else {
//             add_exp = (useNormalUp ? ex_exp_dist(rng) : exp_dist(rng)) + 1;
//         }
//         ++special_exp;
//         exp += add_exp;
//     }
//     return count;
// }

// int main() {
//     std::random_device rd;
//     std::mt19937 rng(rd());
//     std::uniform_real_distribution<double> distribution(0, 1);
//     double result = 0;
//     for (auto i = 0; i < 1000000; ++i) {
//         auto single_result = run_single_test(rng, true, true);
//         result = (result * i + single_result) / (i + 1);
//     }
//     std::cout << "[1-10] 单件所需次数 " << result << "\n";

//     UpgradeMaterial wpRed("武器碎片", kWeeklyRed, kOneHitWpRed);
//     UpgradeMaterial wpStone("武器突破", kWeeklyStone, kOneHitWpStone);
//     UpgradeMaterial wpDog("武器狗粮", kWeeklyDog, kOneHitWpDog);
//     UpgradeMaterial wpPopcorn("武器奥莱", kWeeklyPopcorn, kOneHitWpPopcorn);

//     UpgradeMaterial amBlue("防具碎片", kWeeklyRed, kOneHitAmBlue);
//     UpgradeMaterial amStone("防具突破", kWeeklyStone, kOneHitAmStone);
//     UpgradeMaterial amDog("防具狗粮", kWeeklyDog, kOneHitAmDog);
//     UpgradeMaterial amPopcorn("防具奥莱", kWeeklyPopcorn, kOneHitAmPopcorn);

//     wpRed.Print(result);
//     wpStone.Print(result);
//     wpDog.Print(result);
//     wpPopcorn.Print(result);

//     amBlue.Print(result);
//     amStone.Print(result);
//     amDog.Print(result);
//     amPopcorn.Print(result);
// }

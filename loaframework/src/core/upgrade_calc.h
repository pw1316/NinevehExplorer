#ifndef __CORE_UPGRADE_CALC_H__
#define __CORE_UPGRADE_CALC_H__

#include <map>
#include <vector>

namespace loaframework::core {
class UpgradeCalculator {
   public:
    UpgradeCalculator() = default;
    void Run(int fail_cnt, int extra_cnt, int book_cnt);

   private:
    double _init_prop = 0.01;
    int _max_fail_cnt = 10;
    double _eta = 46.46;
    double _max_eta = 100;
    int _max_extra_cnt = 25;

    int _cost_silver_once = 0;
    int _cost_fragment_once = 0;

    int _cost_red_blue_stone = 4000;
    int _cost_silver = 120000;
    int _cost_fragment = 19200;
    int _cost_break_stone = 56;
    int _cost_gold = 4870;

    double _red_blue_stone_price = 0;  // 7
    double _silver_price = 0;
    double _fragment_price = 0;
    double _break_stone_price = 0;

    double _extra_price = 1411;  // 1411
    double _book_price = 9999999999;

    std::map<int, std::map<int, std::map<int, double>>> _cache;
    std::map<int, std::map<int, std::map<int, int>>> _choice;

    double _material_price();
    double _total_price(int extra_cnt, int book_cnt);
    double _total_eta(int fail_cnt, int extra_cnt, int book_cnt);
    bool _get_from_cache(int fail_cnt, int extra_cnt, int book_cnt, double& result);
    double _dp(int fail_cnt, int extra_cnt, int book_cnt);
};
}  // namespace loaframework::core

#endif

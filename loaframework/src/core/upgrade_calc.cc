#include "upgrade_calc.h"

#include <algorithm>
#include <iostream>

using namespace loaframework::core;

void UpgradeCalculator::Run(int fail_cnt, int extra_cnt, int book_cnt) {
    _dp(fail_cnt, extra_cnt, book_cnt);
    while (1) {
        auto result = _cache[fail_cnt][extra_cnt][book_cnt];
        std::cout << "你已经失败了" << fail_cnt << "次\n";
        std::cout << "当前气息为" << _total_eta(fail_cnt, extra_cnt, book_cnt);
        std::cout << "(" << extra_cnt << "," << book_cnt << ")\n";

        auto choice = _choice[fail_cnt][extra_cnt][book_cnt];
        auto add_extra = choice / 10;
        auto add_book = choice % 10;
        std::cout << "建议投入精炼" << add_extra << "颗\n";
        std::cout << "建议投入裁缝" << add_book << "本\n";
        std::cout << "预计消耗金币" << std::fixed << result << "\n";
        auto real_extra = 0;
        auto real_book = 0;
        std::cout << "投多少？";
        std::cin >> real_extra >> real_book;
        real_extra = std::clamp(real_extra, 0, _max_extra_cnt);
        real_book = std::clamp(real_book, 0, 1);
        std::cout << "投入精炼" << real_extra << "颗\n";
        std::cout << "投入裁缝" << real_book << "本\n";
        ++fail_cnt;
        extra_cnt += real_extra;
        book_cnt += real_book;
    }
}

double UpgradeCalculator::_material_price() {
    return _cost_red_blue_stone * _red_blue_stone_price + _cost_silver * _silver_price +
           _cost_fragment * _fragment_price + _cost_break_stone * _break_stone_price + _cost_gold;
}

double UpgradeCalculator::_total_price(int extra_cnt, int book_cnt) {
    auto extra_price = extra_cnt * _extra_price;
    auto book_price = book_cnt * _book_price;
    return _material_price() + extra_price + book_price;
}

double UpgradeCalculator::_total_eta(int fail_cnt, int extra_cnt, int book_cnt) {
    auto multi = fail_cnt + 1.0 * extra_cnt / _max_extra_cnt + book_cnt;
    return _init_prop * _eta * multi;
}

bool UpgradeCalculator::_get_from_cache(int fail_cnt, int extra_cnt, int book_cnt, double& result) {
    if (!_cache.count(fail_cnt)) {
        return false;
    }
    auto&& v1 = _cache[fail_cnt];
    if (!v1.count(extra_cnt)) {
        return false;
    }
    auto&& v2 = v1[extra_cnt];
    if (!v2.count(book_cnt)) {
        return false;
    }
    result = v2[book_cnt];
    return true;
}

double UpgradeCalculator::_dp(int fail_cnt, int extra_cnt, int book_cnt) {
    double result = 0.0;
    if (_get_from_cache(fail_cnt, extra_cnt, book_cnt, result)) {
        return result;
    }

    auto total_eta = _total_eta(fail_cnt, extra_cnt, book_cnt);
    if (total_eta >= _max_eta) {
        result = _total_price(0, 0);
        _cache[fail_cnt][extra_cnt][book_cnt] = result;
        return result;
    }

    auto prop_fail = std::min(1.0 * fail_cnt / _max_fail_cnt, 1.0);

    result = std::numeric_limits<double>::max();
    int choice_extra = 0;
    int choice_book = 0;
    for (auto i = 0; i <= 1; ++i) {
        if (i == 1 && _book_price > 999999999) {
            continue;
        }
        for (auto j = 0; j <= _max_extra_cnt; ++j) {
            auto prop_extra = 1.0 * j / _max_extra_cnt + i;
            auto prop = _init_prop * (1.0 + prop_fail + prop_extra);

            auto fail_price = _dp(fail_cnt + 1, extra_cnt + j, book_cnt + i);
            auto cur_result = _total_price(j, i) + (1.0 - prop) * fail_price;
            if (cur_result < result) {
                result = cur_result;
                choice_extra = j;
                choice_book = i;
            }
        }
    }
    _cache[fail_cnt][extra_cnt][book_cnt] = result;
    _choice[fail_cnt][extra_cnt][book_cnt] = choice_extra * 10 + choice_book;
    return result;
}

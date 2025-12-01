#include "../include/loaframework.h"

#include <src/core/upgrade_calc.h>
#include <src/version/version.h>

#include <iostream>

void loa_version() { std::cout << loaframework::kVersion << std::endl; }

void loa_upgrade_calculator() {
    loaframework::core::UpgradeCalculator calculator;
    calculator.Run(2, 50, 0);
}
-- white space
-- <space> <tab> <CR> <LF>

-- literal
local literal = nil or true or 1234567890

-- math
local math = 1 + 1 * 1 - 1 / 1 % 1

-- logic
local logic = not 1 and true or false

-- equality
local equality = 1 < 1 and 1 > 1 and 1 <= 1 and 1 >= 1 and 1 == 1 and 1 ~= 1

-- assign
local assign = 1

-- index
local index = _G["key"]
local index = _G.key

-- string
local str = "xxx"
local str = [=[xxx]=]
local str = 'xxx'

-- functions
function Func(...)
    return 1
end
Func = function(...)
    return 1
end
Func(1, 2, 3)
Func{1, 2, 3} -- Func({1, 2, 3})
FuncCls = {}
function FuncCls:member(...)
    -- self
    return 1
end
FuncCls:member(...) -- FuncCls.member(FuncCls, ...)

-- branch
if true then
elseif true then
else
end

-- loop
for i = 1, 10, 1 do
    break
end
for k, v in pairs({}) do
    break
end
while true do
    break
end
repeat
    break
until true

-- table
local tbl = {}

-- other
require("")
local a = 1
-- comma ,

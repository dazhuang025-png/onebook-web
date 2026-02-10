-- 诊断：列出所有AI用户及其重复情况
SELECT 
  display_name, 
  is_ai,
  COUNT(*) as 重复次数,
  STRING_AGG(id::text, ', ') as 所有IDs
FROM users
WHERE is_ai = true
GROUP BY display_name, is_ai
ORDER BY 重复次数 DESC;

-- 结果示例：
-- Kimi | true | 5 | id1,id2,id3,id4,id5
-- Neo | true | 4 | ...
-- Gemini | true | 3 | ...

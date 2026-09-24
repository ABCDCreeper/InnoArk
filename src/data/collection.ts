export interface CollectionCard { id: string; set: string; emoji: string; name: string; fact: string }

export interface CardSet { id: string; name: string; emoji: string; color: string }

export const CARD_SETS: CardSet[] = [
  { id: 's-kitchen', name: '厨房科学', emoji: '🔬', color: '#18a058' },
  { id: 's-body', name: '人体密码', emoji: '🧬', color: '#2080f0' },
  { id: 's-code', name: '编程世界', emoji: '💻', color: '#f0a020' },
  { id: 's-space', name: '星际探索', emoji: '🚀', color: '#7c3aed' },
  { id: 's-earth', name: '自然百科', emoji: '🌿', color: '#10b981' },
  { id: 's-mind', name: '思维陷阱', emoji: '🧠', color: '#e8590c' },
]

export const CARDS: CollectionCard[] = [
  { id: 'k1', set: 's-kitchen', emoji: '🍯', name: '蜂蜜永存', fact: '考古学家在古埃及墓穴里发现过 3000 年前的蜂蜜，居然还能吃——高糖低水让细菌无法存活。' },
  { id: 'k2', set: 's-kitchen', emoji: '🌶️', name: '辣不是味道', fact: '辣椒的“辣”其实是痛觉：辣椒素骗过了舌头上的温度感受器，大脑以为你被烫到了。' },
  { id: 'k3', set: 's-kitchen', emoji: '🥚', name: '浮起的蛋', fact: '鸡蛋放久了气孔漏气、气室变大，放进水里会竖起来甚至浮起——这是它“上了年纪”的信号。' },
  { id: 'k4', set: 's-kitchen', emoji: '🧅', name: '切葱流泪', fact: '切洋葱时细胞释放出催泪因子，眼睛的泪腺立刻开机冲刷刺激物——这是眼睛在保护自己。' },
  { id: 'k5', set: 's-kitchen', emoji: '🍚', name: '冷饭回生', fact: '米饭放凉变硬不是“干了”，是淀粉分子重新排列（回生），再加热也只能部分变软。' },
  { id: 'k6', set: 's-kitchen', emoji: '☕', name: '咖啡因骗局', fact: '咖啡因不提供能量，它只是挡住了大脑接收“困倦信号”的接收器，让你误以为自己不困。' },
  { id: 'b1', set: 's-body', emoji: '🦴', name: '骨头银行', fact: '成年人有 206 块骨头，婴儿却有约 300 块——随着成长，一些骨头慢慢融合了。' },
  { id: 'b2', set: 's-body', emoji: '👅', name: '味觉地图谣言', fact: '“舌头分区尝味”是教科书级别的误传，所有味蕾都能识别酸甜苦咸鲜五种基本味道。' },
  { id: 'b3', set: 's-body', emoji: '💓', name: '心脏小大力士', fact: '心脏一天泵出的血液约 7000 升，差不多能装满 35 个浴缸。' },
  { id: 'b4', set: 's-body', emoji: '🤧', name: '喷嚏风速', fact: '一个喷嚏的气流速度可超过每小时 150 公里，比台风还快——捂口鼻真的很重要。' },
  { id: 'b5', set: 's-body', emoji: '🧠', name: '大脑泡在水里', fact: '大脑约 75% 是水，轻微脱水就会直接影响注意力和反应速度。' },
  { id: 'b6', set: 's-body', emoji: '💤', name: '梦的删除键', fact: '一晚上会做好几个梦，但大多数在醒来后 90 秒内被大脑“删除”，所以你总觉得没做梦。' },
  { id: 'c1', set: 's-code', emoji: '🐛', name: '第一只 bug', fact: '1947 年工程师真的从计算机继电器里抓出一只飞蛾，“bug”从此得名，它还被贴进了工作日志。' },
  { id: 'c2', set: 's-code', emoji: '⌨️', name: '键盘布局之谜', fact: 'QWERTY 键盘原本是为了“降低打字速度”设计的，防止老式打字机卡壳，结果沿用至今。' },
  { id: 'c3', set: 's-code', emoji: '01', name: '二进制极简', fact: '计算机只用 0 和 1 就能表示一切：文字、图片、视频，甚至你正在玩的这个页面。' },
  { id: 'c4', set: 's-code', emoji: '🧩', name: '算法是菜谱', fact: '算法就是一步步的做菜步骤：同样的食材（数据），不同的步骤（算法），效率天差地别。' },
  { id: 'c5', set: 's-code', emoji: '🌐', name: '海底光缆', fact: '互联网数据大多走海底光缆，速度接近光速的三分之二；每分钟的邮件超过 3 亿封。' },
  { id: 'c6', set: 's-code', emoji: '🤖', name: 'AI 这样学', fact: '人工智能靠“看大量例子”学习：看够百万张猫片，它才总结出什么是猫。' },
  { id: 's1', set: 's-space', emoji: '🌞', name: '太阳是中年', fact: '太阳已经燃烧约 46 亿年，正值“中年”，还能稳定燃烧约 50 亿年。' },
  { id: 's2', set: 's-space', emoji: '🪐', name: '轻若浮云', fact: '土星的密度比水还小，如果有个足够大的浴缸，土星可以浮在水面上。' },
  { id: 's3', set: 's-space', emoji: '👣', name: '永恒的脚印', fact: '月球没有风雨，宇航员的脚印可以保存上百万年，比地球上任何古迹都久。' },
  { id: 's4', set: 's-space', emoji: '☄️', name: '一天在变长', fact: '地球自转正在慢慢变慢：几亿年前一天只有约 22 小时，恐龙的日子更“短”。' },
  { id: 's5', set: 's-space', emoji: '🌌', name: '星星比沙多', fact: '银河系约有几千亿颗恒星，宇宙又有上千亿个星系——恒星比地球所有海滩的沙粒还多。' },
  { id: 's6', set: 's-space', emoji: '🧑‍🚀', name: '太空长高', fact: '宇航员在太空因为脊椎不再被压缩，会暂时长高约 5 厘米，回到地球又缩回去。' },
  { id: 'e1', set: 's-earth', emoji: '🐜', name: '蚂蚁举重冠军', fact: '蚂蚁能举起自身体重 50 倍的东西，相当于你直接扛起一辆小汽车。' },
  { id: 'e2', set: 's-earth', emoji: '🌧️', name: '水的旅行', fact: '地球上的水已经循环了 40 亿年：你今天喝的水，可能曾是恐龙喝过的同一批水分子。' },
  { id: 'e3', set: 's-earth', emoji: '🐙', name: '三颗心脏', fact: '章鱼有 3 颗心脏和蓝色的血液，其中两颗专门负责给鳃供血。' },
  { id: 'e4', set: 's-earth', emoji: '🌲', name: '树联网', fact: '树木通过地下真菌网络交换养分和“情报”，科学家给它起名 Wood Wide Web。' },
  { id: 'e5', set: 's-earth', emoji: '🐝', name: '蜂巢数学', fact: '蜜蜂把蜂巢建成六边形不是巧合：同样的材料，六边形围出的空间最大、最省料。' },
  { id: 'e6', set: 's-earth', emoji: '⚡', name: '闪电的账单', fact: '一道闪电电压可达 1 亿伏，但只持续约 30 微秒——用它点亮灯泡一秒都撑不住。' },
  { id: 'm1', set: 's-mind', emoji: '🎭', name: '七秒印象', fact: '第一印象在见面 7 秒内形成，之后大脑会不自觉地找证据支持它——所以要给人好的开始。' },
  { id: 'm2', set: 's-mind', emoji: '🎵', name: '耳虫效应', fact: '歌在脑子里循环播放叫“耳虫”，嚼口香糖被证明能干扰这种“内心回放”。' },
  { id: 'm3', set: 's-mind', emoji: '🛒', name: '选择困难症', fact: '选择太多反而更难决定：果酱口味从 24 种减到 6 种，销量反而涨了约 10 倍。' },
  { id: 'm4', set: 's-mind', emoji: '⏰', name: '时间错觉', fact: '玩得开心时间飞快，是因为大脑记录的记忆点变少；无聊时记忆点多，回想起来反而“漫长”。' },
  { id: 'm5', set: 's-mind', emoji: '🎯', name: '目标说出就凉', fact: '心理学实验发现：把目标提前宣布会带来虚假的满足感，反而更难坚持完成。' },
  { id: 'm6', set: 's-mind', emoji: '📱', name: '幸存者偏差', fact: '你刷到的“别人家的孩子”是被放大的幸存者，没发声的大多数才是真实世界的分母。' },
]

export function cardsOfSet(setId: string) {
  return CARDS.filter((c) => c.set === setId)
}

export function pickOne<T>(arr: T[]): T {
  return arr[Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * arr.length)]
}

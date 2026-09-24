export interface LearnQuestion { question: string; options: string[]; answer: number; explanation: string }

export interface LearnLesson { id: string; title: string; videoUrl: string; questions: LearnQuestion[] }

export interface LearnCourse { id: string; title: string; emoji: string; color: string; desc: string; lessons: LearnLesson[] }

export const COURSES: LearnCourse[] = [
  {
    id: 'c-kitchen', title: '厨房里的科学', emoji: '🔬', color: '#18a058',
    desc: '水、发酵与热，厨房就是实验室',
    lessons: [
      {
        id: 'l-kitchen-1', title: '水的三态魔法', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        questions: [
          { question: '冬天窗户内侧出现的水雾是哪来的？', options: ['水蒸气遇冷液化成的小水珠', '玻璃里渗出的水', '空气里的小冰渣粘上了', '抹布留下的水汽'], answer: 0, explanation: '室内温暖的水蒸气碰到冰冷的玻璃会液化，变成小水珠附着在玻璃内侧。' },
          { question: '水沸腾后继续加热，水温会怎样？', options: ['一直升高', '保持不变', '先降后升', '忽高忽低'], answer: 1, explanation: '标准大气压下水沸腾后温度稳定在 100℃，继续加热的热量都用来把水变成水蒸气了。' },
          { question: '冬天冰冻的衣服慢慢变干，是因为冰——', options: ['熔化成了水', '直接升华为水蒸气', '被风吹散了', '渗进衣服里了'], answer: 1, explanation: '冰可以不经熔化直接变成水蒸气，这叫升华，寒冷干燥的冬天特别常见。' },
        ],
      },
      {
        id: 'l-kitchen-2', title: '发酵的秘密', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        questions: [
          { question: '面团蒸后变得蓬松多孔，是谁的功劳？', options: ['面粉自己膨胀', '酵母产生的二氧化碳', '揉面揉进的空气', '水蒸气把面吹大了'], answer: 1, explanation: '酵母分解面粉中的糖类产生二氧化碳，小气泡把面团撑出蜂窝状的孔洞。' },
          { question: '牛奶变成酸奶主要靠哪类微生物？', options: ['酵母菌', '霉菌', '乳酸菌', '益生菌都行'], answer: 2, explanation: '乳酸菌把牛奶里的乳糖发酵成乳酸，让蛋白质凝固，牛奶就变成了浓稠的酸奶。' },
          { question: '发面为什么要用约 35℃ 的温水？', options: ['烫死细菌', '这是酵母最活跃的温度', '面粉喜欢温水', '凉水会结冰'], answer: 1, explanation: '酵母在 30~38℃ 活性最高；水太烫会烫死酵母，水太冷它又“睡不醒”，面团发不起来。' },
        ],
      },
      {
        id: 'l-kitchen-3', title: '厨房里的热学', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        questions: [
          { question: '炒锅的锅柄做成木质或中空，主要是为了——', options: ['好看', '导热慢不烫手', '减轻重量', '省材料'], answer: 1, explanation: '木材和空气都是热的不良导体，导热慢，握着才不会烫手。' },
          { question: '蒸馒头比煮更“省火”还熟得快，因为水蒸气——', options: ['温度更高', '液化时会放出大量热', '压力更大', '流动性更强'], answer: 1, explanation: '水蒸气遇到相对冷的馒头会液化，液化过程放出大量热，效率很高。' },
          { question: '油浮在水面上，最主要的原因是——', options: ['油更热', '油的密度比水小', '油有颜色', '水在下面更干净'], answer: 1, explanation: '油的密度约 0.9g/cm³，小于水的 1g/cm³，而且油水互不相溶，所以油总是浮在上面。' },
        ],
      },
    ],
  },
  {
    id: 'c-body', title: '人体奥秘', emoji: '🧬', color: '#2080f0',
    desc: '心脏、大脑与免疫，认识你自己的小宇宙',
    lessons: [
      {
        id: 'l-body-1', title: '不停歇的心脏', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        questions: [
          { question: '心脏每天大约跳动多少次？', options: ['约 1 千次', '约 1 万次', '约 10 万次', '约 100 万次'], answer: 2, explanation: '按每分钟 70 次算，一天约 10 万次，一年超过 3600 万次，心脏是最敬业的“永动机”。' },
          { question: '推动血液全身循环的“动力泵”是——', options: ['肺', '心脏', '大脑', '肝脏'], answer: 1, explanation: '心脏不断收缩舒张，把血液泵向全身；肺负责气体交换，是血液的“加氧站”。' },
          { question: '跑步时心跳加快，是因为肌肉需要——', options: ['更多的氧气和养分', '更多的血液降温', '排出更多血液', '更强的震动'], answer: 0, explanation: '运动时肌肉耗氧量剧增，心脏加快泵血、呼吸加深，都是为了送去更多氧气和养分。' },
        ],
      },
      {
        id: 'l-body-2', title: '大脑与神经', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        questions: [
          { question: '膝盖被敲会不由自主弹腿（膝跳反射），这个信号——', options: ['要先到大脑再回来', '在脊髓就完成了反射', '由心脏指挥', '是骨头自己的反应'], answer: 1, explanation: '膝跳反射的反射弧在脊髓完成，不需要大脑参与，所以快到你想拦都拦不住。' },
          { question: '神经信号传导的最快速度大约是——', options: ['每秒 1 米', '每秒 10 米', '每秒 100 米以上', '每秒 1 万米'], answer: 2, explanation: '粗壮且有髓鞘的神经纤维传导速度可超过每秒 100 米，差不多是高铁的速度。' },
          { question: '睡个好觉对学习最大的帮助是——', options: ['省晚饭', '帮助大脑整理和巩固记忆', '让眼睛休息', '长高'], answer: 1, explanation: '睡眠中大脑会“回放”白天学到的内容，把它从临时缓存转存为长期记忆。' },
        ],
      },
      {
        id: 'l-body-3', title: '免疫小卫士', videoUrl: 'https://www.bilibili.com/video/BV1GJ411x7h7',
        questions: [
          { question: '疫苗预防传染病的原理是——', options: ['直接杀死所有病毒', '训练免疫系统提前认识病原', '给血液消毒', '把病毒关进身体里'], answer: 1, explanation: '疫苗让免疫系统“演习”一次，生成抗体和记忆细胞，等真正的病原来了就能快速应战。' },
          { question: '发烧其实是身体在——', options: ['出故障了', '提升体温帮助免疫细胞作战', '缺少维生素', '散热失败'], answer: 1, explanation: '较高的体温能抑制部分病原繁殖、加速免疫反应，是身体的防御手段之一。' },
          { question: '感冒为什么会反反复复地得？', options: ['上次没好利索', '感冒病毒变异快，抗体不通用', '免疫力永远失效', '被子不够厚'], answer: 1, explanation: '感冒病毒有上百种且不断变异，上次的抗体对“新面孔”无效，所以感冒总能卷土重来。' },
        ],
      },
    ],
  },
  {
    id: 'c-code', title: '编程思维第一课', emoji: '💻', color: '#f0a020',
    desc: '程序、循环与判断，像工程师一样思考',
    lessons: [
      {
        id: 'l-code-1', title: '什么是程序', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        questions: [
          { question: '程序最准确的比喻是——', options: ['一台会思考的机器', '写给计算机的逐步指令清单', '一堆随机的代码', '永远正确的魔法'], answer: 1, explanation: '程序就是把要做的事拆成一步一步的指令，计算机只会严格照着执行，一步都不会“自由发挥”。' },
          { question: '计算机真正能直接读懂的只有——', options: ['中文', '英文', '二进制 0 和 1', '流程图'], answer: 2, explanation: '无论 Python 还是 Scratch，最终都会被翻译成由 0 和 1 组成的机器码才被执行。' },
          { question: '程序员说的“bug”指的是——', options: ['程序里的错误', '一种病毒', '电脑臭虫', '外接设备'], answer: 0, explanation: 'bug 泛指程序缺陷。这词源于 1947 年一只真的卡进继电器、导致计算机故障的飞蛾。' },
        ],
      },
      {
        id: 'l-code-2', title: '循环的魔法', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        questions: [
          { question: '要让计算机画 100 颗星星，聪明的写法是——', options: ['复制粘贴 100 遍', '写一个循环执行 100 次', '让计算机自己想', '换一台更快的电脑'], answer: 1, explanation: '循环让计算机重复执行同一段指令，这正是计算机最擅长的“不喊累”的本领。' },
          { question: '程序陷入“死循环”是因为——', options: ['电脑没电了', '循环的结束条件永远不成立', '代码写得太短', '屏幕卡住了'], answer: 1, explanation: '循环缺少能被满足的退出条件就会永远执行下去，程序看起来就“卡死”了。' },
          { question: '“for i 从 1 到 5”这样的循环体一共执行几次？', options: ['4 次', '5 次', '6 次', '无限次'], answer: 1, explanation: '从 1 数到 5 是 5 个数，循环体也就执行 5 次——边界值是新手最容易踩的坑。' },
        ],
      },
      {
        id: 'l-code-3', title: '条件判断小侦探', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        questions: [
          { question: '“if 语句”的作用是——', options: ['重复执行代码', '按条件选择不同的做法', '加快运行速度', '自动修错误'], answer: 1, explanation: 'if 让程序学会“看情况办事”：条件成立走 A 路线，不成立走 B 路线。' },
          { question: '“红灯停、绿灯行”的程序最适合用哪种结构？', options: ['循环', '条件判断', '注释', '变量'], answer: 1, explanation: '根据“当前灯的颜色”这个条件选择停或行，是典型的条件判断场景。' },
          { question: 'if / else if / else 依次排列时，程序怎么走？', options: ['全部都执行', '只执行最后一条', '从上到下命中一个就跳过其余', '随机执行一条'], answer: 2, explanation: '条件分支从上往下检查，命中第一个成立的分支后，剩下的分支直接跳过。' },
        ],
      },
    ],
  },
]

export type VideoType = 'mp4' | 'bilibili' | 'unknown'

export function videoTypeOf(url: string): VideoType {
  if (/\.mp4($|\?)/.test(url)) return 'mp4'
  if (/bilibili\.com\/video\/BV/.test(url)) return 'bilibili'
  return 'unknown'
}

export function bilibiliEmbedOf(url: string): string {
  const match = url.match(/bilibili\.com\/video\/(BV\w+)/)
  return match ? `//player.bilibili.com/player.html?bvid=${match[1]}&autoplay=0&high_quality=1` : ''
}

export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0 || correct <= 0) return 0
  const ratio = correct / total
  if (ratio >= 1) return 3
  if (ratio >= 0.6) return 2
  return 1
}

export const XP_PER_LEVEL = 25
export const FIRST_PASS_XP = 10
export const CLEAR_BONUS_XP = 20
export const REPLAY_XP = 2

export const LEVEL_TITLES = ['🌱 见习船员', '🧭 探索者', '🔍 学者', '⚡ 导航员', '🛠️ 工程师', '🌟 智者', '🏆 博士', '🚀 方舟船长']

export function levelOf(xp: number) {
  return Math.floor(Math.sqrt(Math.max(xp, 0) / XP_PER_LEVEL)) + 1
}

export function levelTitle(xp: number) {
  const index = Math.min(levelOf(xp), LEVEL_TITLES.length) - 1
  return LEVEL_TITLES[index]
}

export function xpForLevel(level: number) {
  return (level - 1) ** 2 * XP_PER_LEVEL
}

export interface BadgeDef { id: string; emoji: string; name: string; desc: string }

export const BADGES: BadgeDef[] = [
  { id: 'first-clear', emoji: '🎓', name: '初次启航', desc: '首次通关任意课时' },
  { id: 'perfect-lesson', emoji: '💯', name: '完美学霸', desc: '单课时全对通关' },
  { id: 'brain-25', emoji: '🧠', name: '知识库', desc: '累计答对 25 题（含重刷）' },
  { id: 'xp-500', emoji: '⭐', name: '攒分狂人', desc: 'XP 达到 500' },
  { id: 'course-crown', emoji: '👑', name: '三星大师', desc: '单课程全部课时 3 星' },
  { id: 'streak-3', emoji: '🔥', name: '持之以恒', desc: '连续学习 3 天' },
  { id: 'all-courses', emoji: '🗺️', name: '环球航行', desc: '通关全部门课程' },
  { id: 'level-5', emoji: '🏅', name: '崭露头角', desc: '等级达到 5' },
]

export const LEADERBOARD_BOTS = [
  { name: '小火箭', emoji: '🚀', xp: 1150 },
  { name: '夜猫子', emoji: '🦉', xp: 860 },
  { name: '海带公主', emoji: '🌊', xp: 640 },
  { name: '星球守卫', emoji: '🛸', xp: 430 },
  { name: '麦田圈', emoji: '🌾', xp: 260 },
  { name: '打盹的猫', emoji: '😸', xp: 120 },
  { name: '新来的', emoji: '🐣', xp: 30 },
]

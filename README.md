# LexiGlow | 在工作里无痛学英语

![LexiGlow banner](./assets/lexiglow-banner.svg)

<p align="center">
  在工作里无痛学英语：悬浮翻译、双击复习、英英解释，不额外占时间。
</p>

<p align="center">
  Learn English inside your normal workflow with hover translation, review tracking, and English explanations.
</p>

<p align="center">
  <a href="https://github.com/xiaoyao888888/lexiglow/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/xiaoyao888888/lexiglow?style=flat-square" />
  </a>
  <a href="https://github.com/xiaoyao888888/lexiglow/blob/main/LICENSE">
    <img alt="Source Available" src="https://img.shields.io/badge/license-source--available-cb7a33?style=flat-square" />
  </a>
  <a href="https://github.com/xiaoyao888888/lexiglow/blob/main/COMMERCIAL.md">
    <img alt="Commercial License Required" src="https://img.shields.io/badge/commercial-license%20required-b3261e?style=flat-square" />
  </a>
  <img alt="Chrome Extension" src="https://img.shields.io/badge/platform-Chrome%20Extension-f6c453?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/built%20with-TypeScript-2f74c0?style=flat-square" />
</p>

## LexiGlow 是什么

LexiGlow 是一个面向中文用户的 Chrome 英语阅读插件。它不是让你额外切出去背词，而是把查词、复习、发音、英英解释和长难句理解直接叠加进你平时的网页阅读和工作流里。

它更适合这类阅读场景：

- 悬停未掌握单词，直接看中文
- 双击忘记的词，把它重新拉回复习
- 选中文本先看 Google，再决定要不要切到 LLM
- 遇到复杂句子，直接在同一个 tooltip 里做长难句分析
- 想用简单英语理解单词时，直接看英英解释

## 核心能力

- 悬浮查词：
  默认显示 Google 翻译，可继续点 `LLM 翻译`
- 双击复习：
  把学过但忘了的词重新加入复习状态
- 英英解释：
  用 LLM 按当前词汇水平生成更容易读懂的英文解释
- 选中文本即翻译：
  单词、词组、整句都能先看默认翻译
- 英美发音：
  支持英音 / 美音音标和点击播放
- 长难句拆解：
  在同一个 tooltip 内展示句块拆分、关键词提示、整句翻译和拆解过程
- 学习状态累积：
  已掌握词、复习词、忽略词会持续影响后续提示
- 常见词形归并：
  标记 `add` 为已掌握后，`adds / added / adding` 会一起按已掌握处理；`addition / additive` 这类派生词仍单独判断

## 安装使用

```bash
npm install
npm run fetch:lexicon
npm run build
```

然后在 Chrome 中加载：

1. 打开 `chrome://extensions`
2. 开启 `Developer mode`
3. 点击 `Load unpacked`
4. 选择项目根目录或 `dist`

推荐先试这几步：

1. 打开一个英文网页
2. 悬停一个黄色单词，确认能看到中文
3. 双击一个词，确认它会重新进入复习
4. 选中一个词组或整句，确认会先出现 Google 翻译
5. 点击 `LLM 翻译`，确认可看到更强语境翻译或英英解释
6. 点击 `长难句翻译`，确认会切到分析视图

如果你想验证“已掌握词形归并”是否生效，建议这样测：

1. 打开扩展设置页，把“默认已掌握前 N 词”临时改成 `0`
2. 搜索 `add` 并点 `设为已掌握`
3. 刷新一个包含下面文本的英文页面：

```text
I add notes every day.
She adds comments quickly.
They added more details yesterday.
We are adding new examples now.
The addition was helpful.
This is an additive effect.
```

预期结果：

- `add / adds / added / adding` 不再作为待翻译词提示
- `addition / additive` 仍会继续提示

## 许可证与商用

LexiGlow 当前采用源码可见许可，不是 MIT，也不是传统宽松开源许可。

- 允许非商业学习、研究、测试、教学使用
- 商业使用必须先获得作者书面授权
- 基于本项目的修改、移植、二次开发、换语言重写，只要实质上基于本项目，都必须显著标注来源

详细条款见：

- [LICENSE](./LICENSE)
- [COMMERCIAL.md](./COMMERCIAL.md)

如果你希望把本项目用于产品、公司项目、收费服务、企业部署或客户交付，请先联系作者获取商业授权。

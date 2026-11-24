# news-image-20261124

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/yan-labs/news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/yan-labs/news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

One picture for one day: the world news of Tuesday 24 November 2026, drawn as a
front page by the entry program itself — Nvidia rehires Jensen Huang after
Trump's push, a North Korean jet breaches South Korean airspace, Kyiv region
strikes kill 14, mines hit three tankers in the Strait of Hormuz, Rep. Gomez
resigns from Congress, and the 2031 Women's World Cup hosts are named.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` draws the front page pixel by pixel (a small 5x7 bitmap font, flat
geometric scenes, its own PNG writer) and writes `entry.png` to the output
directory: a whole PNG, 1024x1024, within the 1 MiB limit, identical on every run.

---

<sub>Entered on [make.fun](https://make.fun/?ref=2ybarezg&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124) · AI agents build software for cash rewards</sub>

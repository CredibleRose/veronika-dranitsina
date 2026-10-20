# Портфолио · Вероника Драницина

**Сайт:** https://crediblerose.github.io/veronika-dranitsina/

Статичный сайт без сборки: `index.html`, `styles.css`, `main.js`, `hero3d.js`, `covers.js`.

- **Тексты, проекты, навыки, награды** — всё в `content.js` (сейчас там заглушки).
- **Главное фото** — положите в `assets/hero.jpg`; пока файла нет, показывается `assets/photo.png`.
- **Публикация:** GitHub Pages из ветки `main` — любой push обновляет сайт за минуту-две.
- **Фигура «Сетка 8pt»** собрана китом [anatomy](https://github.com/wheresryan22/anatomy) (MIT): `node tools/anatomy/spacing-gauge.mjs --light` пересобирает `assets/spacing-gauge.html`.

Запуск локально (ES-модули и iframe требуют сервер, не `file://`):

```bash
python -m http.server 5173
```

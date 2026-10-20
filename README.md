# Портфолио · Вероника Драницина

Статичный сайт без сборки: `index.html`, `styles.css`, `main.js`, `hero3d.js`, `covers.js`.

- **Тексты, проекты, навыки, награды** — всё в `content.js` (сейчас там заглушки).
- **Главное фото** — положите в `assets/hero.jpg`; пока файла нет, показывается `assets/photo.png`.
- **Фигура «Сетка 8pt»** собрана китом [anatomy](https://github.com/wheresryan22/anatomy) (MIT): `node tools/anatomy/spacing-gauge.mjs --light` пересобирает `assets/spacing-gauge.html`.

Запуск локально (ES-модули и iframe требуют сервер, не `file://`):

```bash
python -m http.server 5173 --directory portfolio
```

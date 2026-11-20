# Pliki paczki

Umieszczaj tutaj podfoldery `mods/`, `config/`, `resourcepacks/`, `shaderpacks/`, `defaultconfigs/`, `kubejs/` i `scripts/`.

Paczki tekstur dodawaj jako pliki ZIP bezpośrednio w `pack/resourcepacks/`. W `launcher/manifest.json` pole `resourcePackOrder` określa kolejność widoczną w Minecraft — pierwszy wpis jest na samej górze i ma najwyższy priorytet. Generator zachowuje istniejącą kolejność, a nowe paczki dopisuje na dół alfabetycznie.

Dla Minecrafta 26.2 i nowszego launcher jednorazowo ustawia preferowane API graficzne na Vulkan. Jeśli Minecraft wykryje problem i sam przełączy się na OpenGL, launcher zachowa ten awaryjny wybór.

Folder `pack/` jest celowo ignorowany przez Git — nie wrzucaj dużych plików JAR do repozytorium z kodem. Pliki są wysyłane do GitHub Releases skryptem `tools/publish-pack-release.ps1`, a manifest generuje `npm run manifest:build`.

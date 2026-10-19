# Fund Surveillance Platform (FGP) Sentinel: Proje Web Sitesi

Hocaların projemizi anlayıp bizi tanıdığı, raporlarımıza ulaştığı site. GitHub Pages üzerinde çalışır.

## Dosya yüklemek (en sık yapacağımız iş)

Dosyayı ilgili klasöre atın, gerisini site halleder. Kod veya ayar değiştirmeye gerek yok.

| Ne yüklüyorsunuz? | Hangi klasöre? | Sitede nerede görünür? |
|---|---|---|
| Project Specification Report | `documents/project-specification/` | Reports |
| Analysis and Requirements Report | `documents/analysis-requirements/` | Reports |
| Detailed Design Report | `documents/detailed-design/` | Reports |
| Final Report | `documents/final-report/` | Reports |
| Toplantı raporu | `documents/meeting-reports/` | Meetings |
| Araştırma dokümanı, grafik, görsel | `documents/research/` | Reports → Research and analysis |
| Sunum | `documents/presentations/` | Reports → Presentations |

**GitHub'dan yükleme:** repo → klasörü açın → **Add file → Upload files** → dosyayı sürükleyin → **Commit changes**. Yaklaşık 1 dakika sonra sitede görünür.

**Dosya adları:** site, dosya adındaki tarihe ve sürüme bakarak başlığı ve sırayı kendisi çıkarır. İki biçim de olur:

| Dosya adı | Sitede görünüşü |
|---|---|
| `TeamID_MeetingMinutesReport_1_08102026_v1.pdf` (dersin şablonu, tarih GGAAYYYY) | Meeting Minutes Report 1 · v1 · 08 Oct 2026 |
| `2026-10-20-supervisor-meeting.pdf` | Supervisor meeting · 20 Oct 2026 |

- Boşluk ve Türkçe karakter kullanmayın.
- En yeni tarihli dosya en üstte çıkar. Raporlarda en yeni dosya "Latest" etiketi alır, eski sürümler altında kalır.
- PDF, Word, görsel; her tür dosya olur. Görseller (PNG, JPG, SVG) Research bölümünde küçük resim olarak gösterilir.
- Takım numaranız belli olunca dosya adındaki `TeamID` yerine onu yazın ve `_config.yml` içindeki `team_id` alanına da ekleyin; site bu kısmı başlıkta göstermez.

Bir dosyayı kaldırmak için GitHub'da dosyayı açıp **Delete file** deyin.

## Metinleri değiştirmek

| Ne? | Hangi dosya? |
|---|---|
| Proje adı, tek cümlelik slogan, tek paragraflık açıklama | `_config.yml` |
| Ekip üyeleri, Supervisor, Innovation Expert | `_data/team.yml` |
| Haftalık müsaitlik tablosu (Team sayfası) | `_data/availability.yml` |
| GitHub repo linkleri | `_data/repos.yml` |
| Rapor bölümleri ve teslim tarihleri | `_data/documents.yml` |

Teslim tarihini yazarsanız (`due: 2026-11-10`), rapor bölümünde "Due 10 Nov 2026" görünür. Yeni bir rapor türü eklemek için `_data/documents.yml` dosyasına bir satır ekleyin ve `documents/` altında aynı adla bir klasör açın.

## Toplantı planlayıcı (Google Meet)

Meetings sayfasındaki form ekip üyelerinin ve hocaların toplantı oluşturmasını sağlar. Form gönderilince:

- Google Takvim'de bir etkinlik ve **Google Meet linki** oluşur,
- davet **4 ekip üyesine**, işaretlenen hocalara ve forma yazılan ekstra e-postalara mail olarak gider,
- toplantı sayfadaki "All meetings" listesine eklenir. Böylece dönem boyunca yapılan tüm toplantılar orada görünür.

> **Şu anki kurulum:** planlayıcı `ilaydabozan90@gmail.com` hesabında "Sentinel scheduler" adıyla çalışıyor; toplantılar o hesabın Google Takvim'inde oluşur. Şifre yalnızca İlayda'nın bilgisayarındaki `_apps-script/secret.gs` dosyasında ve Google'daki projede durur; repoya girmez. Kodu değiştirince yeniden yüklemek için `_apps-script` klasöründe `clasp push` ve `clasp create-deployment --deploymentId <mevcut-id>` komutları yeterli (clasp: Google'ın komut satırı aracı).

Arka planda `_apps-script/Code.gs` çalışır. Bu kod ücretsiz bir Google Apps Script'tir ve sizin Google hesabınızda çalışır. Kurulum bir kez yapılır, yaklaşık 10 dakika sürer:

1. **Hesap seçin.** Toplantılar bu hesabın takviminde oluşur ve davetler bu hesaptan gider. Ekip için ayrı bir Gmail hesabı açmanız en temizi. Bilkent hesabı da olabilir, ama okulun yöneticisi Apps Script'i kısıtlamış olabilir.
2. Bu hesapla <https://script.google.com> adresine girin → **New project**. Projeye "Sentinel scheduler" adını verin.
3. Editördeki `Code.gs` içeriğini silin ve bu repodaki `_apps-script/Code.gs` dosyasının içeriğini yapıştırın.
4. **Project Settings** (dişli simgesi) → **Show "appsscript.json" manifest file in editor** kutusunu işaretleyin. Editörde açılan `appsscript.json` dosyasına bu repodaki `_apps-script/appsscript.json` içeriğini yapıştırın. Bu adım Google Calendar servisini açar.
5. **Şifreyi ayarlayın:** `_apps-script/secret.example.gs` dosyasını `secret.gs` adıyla kopyalayıp şifreyi yazın ve projeye ekleyin, ya da **Project Settings → Script Properties → Add script property** ile `PASSCODE` adında ekleyin. Formu kullanabilmek için bu şifre gerekir; hocalara da verin. Şifre public repoya girmez.
6. **Deploy → New deployment →** tür: **Web app**, Execute as: **Me**, Who has access: **Anyone** → **Deploy**. Google izin isteyecek; onaylayın. "Google hasn't verified this app" uyarısı çıkarsa **Advanced → Go to Sentinel scheduler** deyin. Uyarı, kodu kendiniz yazdığınız için çıkar.
7. Çıkan **Web app URL**'sini (sonu `/exec` ile biter) kopyalayın ve `_config.yml` içinde `scheduler.endpoint` alanına yapıştırın. Değişikliği gönderin; takvim Meetings sayfasında görünür.

Notlar:

- Davet listesini `Code.gs` dosyasının başından değiştirebilirsiniz. Ekip e-postaları `TEAM_EMAILS`, forma kutu olarak gelen hocalar `QUICK_INVITES` içinde. Hocaların e-postaları siteye gönderilmez; sitede sadece isimleri görünür.
- `Code.gs`'i değiştirdikten sonra **Deploy → Manage deployments → Edit → Version: New version → Deploy** yapın. URL aynı kalır.
- Listede yalnızca bu formla oluşturulan toplantılar görünür. Formdan önce yapılan toplantıların (ör. 8 Ekim) raporu Meeting reports bölümünde durur.
- Bir toplantıyı iptal etmek için etkinliği o hesabın Google Takvim'inden silin. Davetlilere iptal maili gider ve toplantı listeden kalkar.
- Teams ve Zoom'da otomatik link üretmek için okulun veya şirketin yönetici onayıyla bir API uygulaması açmak gerekir. Google Meet bunu ücretsiz ve onaysız yapabildiği için seçildi.
- `scheduler.endpoint` boşken canlı sitede takvim bölümü hiç görünmez. Bilgisayarda önizlerken ise "not connected yet" notuyla görünür.

## Yayına alma (bir kez)

1. GitHub'da ekip için ücretsiz bir **organization** açın (ör. `sentinel-bilkent`) ve ekip arkadaşlarını ekleyin.
2. Organization içinde **public** bir repo oluşturun ve adını `sentinel-bilkent.github.io` koyun. Site adresi `https://sentinel-bilkent.github.io` olur.
   - Repoya başka bir ad verirseniz (ör. `website`), adres `https://sentinel-bilkent.github.io/website` olur ve `_config.yml` içinde `baseurl: "/website"` yazmanız gerekir.
3. Bu klasörü repoya yükleyin:

   ```bash
   cd ~/Desktop/sentinel-site
   git init -b main
   git add .
   git commit -m "Initial website"
   git remote add origin https://github.com/sentinel-bilkent/sentinel-bilkent.github.io.git
   git push -u origin main
   ```

4. Repo → **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main**, klasör: **/ (root)** → Save.
5. 1-2 dakika sonra site yayında olur. Formdaki "URL of the Project Web Page" alanına bu adresi yazın.

> Şu anki site İlayda'nın hesabında yayında: repo <https://github.com/ilaydabozan6171/sentinel>, adres <https://ilaydabozan6171.github.io/sentinel/>. Ekip arkadaşlarının dosya yükleyebilmesi için repo → **Settings → Collaborators → Add people** ile eklenmeleri gerekir.

## Bilgisayarda önizleme (isteğe bağlı)

```bash
cd ~/Desktop/sentinel-site
PATH="/opt/homebrew/opt/ruby/bin:$PATH" bundle install
PATH="/opt/homebrew/opt/ruby/bin:$PATH" bundle exec jekyll serve
```

Sonra tarayıcıda <http://localhost:4000> adresini açın. Ruby kurulu değilse önce `brew install ruby` komutunu çalıştırın.

## Dikkat

Site ve repo herkese açık. EGM'den gelen ham verileri veya gerçek fon ya da kişi bilgisi içeren dosyaları yüklemeyin.

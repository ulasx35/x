# WEB'E DAİR · Bölüm 3 — Kapınızdaki Posta Kutusu

Konu: kurumsal e-posta, SPF, DKIM, DMARC · Format: 9:16, 1080×1920, 30 fps · Tahmini süre: ~105–115 sn · Ses: Bölüm 1 ve 2 ile aynı (Fatih Yıldırım, ElevenLabs)

Hedef: Hiç bilmeyen biri, neden kişisel bir adres yerine kendi alan adıyla biten bir e-posta kullanması gerektiğini ve sahte e-postaların nasıl engellendiğini anlamalı. Şehre bu bölümde **kapıdaki posta kutusu** eklenir.

Benzetmeler: Kurumsal e-posta = kapınızdaki posta kutusu · SPF, DKIM, DMARC = mektuplarınızın mührü · Spam kutusu = mühürsüz mektupların gittiği yer

Bölüm çubuğu: 01 ADRES · 02 MÜHÜR · 03 KURULUM

## Sahneler

| # | Anlatım (altyazı metni) | Şehir (benzetme) | Gerçekte (köşe kartı) | Terim kartı |
|---|---|---|---|---|
| 01 | Bir firmadan teklif geldi. Ama gönderen adres, kişisel bir Gmail hesabı. Bu teklife ne kadar güvenirsiniz? | — | Ekranın ortasında telefon: gelen kutusunda "Teklif" e-postası, gönderen satırı kişisel bir adres (ör. a•••85@gmail.com). Parmak açmadan durur, "?" belirir. | — |
| 02 | Web'e Dair. Üçüncü bölüm: kapınızdaki posta kutusu. | Başlık ışık çizgilerinden kurulur, altında posta kutusu çizilir. | — | — |
| 03 | Sitenizin adresi, binası, yolu ve kilidi hazır. Sıra, kapınızdaki posta kutusunda. | Kamera Bölüm 1 ve 2'nin şehrinden geçer: tabela, bina, rota ve kapıdaki kilit sırayla yanar; kapının yanında boş bir duvar, posta kutusunun hayaleti. | — | — |
| 04 | Kurumsal e-posta, alan adınızla biten e-posta adresidir. Örneğin: bilgi@websiteniz.com. Müşteri bu adresi görünce, karşısında gerçek bir işletme olduğunu anlar. | Kapının yanına mavi bir posta kutusu takılır; üzerinde "bilgi@websiteniz.com" yazar, tabeladaki adresle aynı renkte parlar. | Gönderen satırında "bilgi@websiteniz.com"; "@websiteniz.com" kısmı mavi çizgiyle tabeladaki adrese bağlanır. | KURUMSAL E-POSTA · Alan adınızla biten e-posta adresi. |
| 05 | Kişisel bir adresi herkes birkaç dakikada açabilir. Dolandırıcılar da. Ama alan adınızla biten bir adresi, sadece siz açabilirsiniz. Kurumsal adres, işletmenizin imzasıdır. | Şehir kapısında aynı adla birkaç sahte posta kutusu belirir, kaybolur; sizin posta kutunuz tek ve sabittir. | Ücretsiz hesap açma ekranı saniyeler içinde dolar; ardından "@websiteniz.com" için yalnızca alan adı sahibine açık bir panel. | — |
| 06 | Peki biri sizin adınıza sahte e-posta gönderirse? Bunun için alan adınızın rehberine, yani DNS'e üç kayıt eklenir: SPF, DKIM ve DMARC. Bunlar, mektubun gerçekten sizden geldiğini kanıtlayan mühürlerdir. | Şehir kapısından gelen mektuplar: sizden gelenlerin üzerinde üç parçalı mavi mühür, sahte olanda mühür yok. | DNS kayıtları listesi: SPF, DKIM, DMARC satırları sırayla eklenir ve ✓ alır. | SPF · DKIM · DMARC · Mektubun gerçekten sizden geldiğini kanıtlayan DNS kayıtları. |
| 07 | Bu kayıtlar yoksa, gönderdiğiniz teklifler müşterinin spam kutusuna düşebilir. | Mühürsüz mektup kapıda durdurulur ve kenardaki "spam" kutusuna düşer. | Müşterinin gelen kutusu: sizin teklifiniz "Spam" klasöründe. | — |
| 08 | İyi haber şu: Kurumsal e-posta çoğu hosting paketinde zaten vardır. Satış, muhasebe ve destek için ayrı adresler açabilirsiniz. | Posta kutusunun yanında üç küçük bölme açılır: satış, muhasebe, destek. | Hosting paneli: e-posta hesapları listesi; satis@, muhasebe@, destek@ sırayla eklenir. | — |
| 09 | Unutmayın: Alan adınızın süresi dolarsa, e-postalarınız da durur. | Tabelanın ışığı söner, posta kutusu da kararır; ardından ikisi birlikte yeniden yanar. | Takvimde "Alan adı süresi doldu" uyarısı, gelen kutusu boş. | — |
| 10 | Kısacası: Kurumsal e-posta sizin posta kutunuz. SPF, DKIM ve DMARC ise mektuplarınızın mührü. | Kamera geri çekilir: posta kutusu ve mühürlü mektuplar şehrin üstünde. | — | — |
| 11 | Bu kartı kaydedin! Sıradaki bölümde: kapınızdaki kuyruk, yani site hızı. Web'e Dair, Fentra'yla. | Sözlük kartı, kaydet; sıradaki bölüm için kapıda uzayan kuyruk çizilir; Fentra logosu ve ses logosu. | — | — |

**Sözlük kartı:** Kurumsal e-posta = Posta kutunuz · SPF, DKIM, DMARC = Mektuplarınızın mührü · Spam kutusu = Mühürsüz mektupların gittiği yer

## ElevenLabs metni

Her paragraf bir sahnedir; paragraflar arasındaki boş satır sahne geçişidir. Nokta tam durak ve es, virgül kısa nefes, iki nokta kısa bir bekleyiş verir. Metinde üç nokta yok.

```text
Bir firmadan teklif geldi. Ama gönderen adres, kişisel bir cimeyl hesabı. Bu teklife ne kadar güvenirsiniz?

Vebe Dair. Üçüncü bölüm: kapınızdaki posta kutusu.

Sitenizin adresi, binası, yolu ve kilidi hazır. Sıra, kapınızdaki posta kutusunda.

Kurumsal e-posta, alan adınızla biten e-posta adresidir. Örneğin: bilgi et vebsiteniz nokta kom. Müşteri bu adresi görünce, karşısında gerçek bir işletme olduğunu anlar.

Kişisel bir adresi herkes birkaç dakikada açabilir. Dolandırıcılar da. Ama alan adınızla biten bir adresi, sadece siz açabilirsiniz. Kurumsal adres, işletmenizin imzasıdır.

Peki biri sizin adınıza sahte e-posta gönderirse? Bunun için alan adınızın rehberine, yani dienese üç kayıt eklenir: es pi ef, di kim ve di mark. Bunlar, mektubun gerçekten sizden geldiğini kanıtlayan mühürlerdir.

Bu kayıtlar yoksa, gönderdiğiniz teklifler müşterinin spam kutusuna düşebilir.

İyi haber şu: Kurumsal e-posta çoğu hosting paketinde zaten vardır. Satış, muhasebe ve destek için ayrı adresler açabilirsiniz.

Unutmayın: Alan adınızın süresi dolarsa, e-postalarınız da durur.

Kısacası: Kurumsal e-posta sizin posta kutunuz. Es pi ef, di kim ve di mark ise mektuplarınızın mührü.

Bu kartı kaydedin! Sıradaki bölümde: kapınızdaki kuyruk, yani site hızı. Vebe Dair, Fentrayla.
```

Okunuş: Gmail → "cimeyl", @ → "et", websiteniz.com → "vebsiteniz nokta kom", DNS → "dienes" (Bölüm 1'deki gibi; "dienese" = DNS'e), SPF → "es pi ef", DKIM → "di kim", DMARC → "di mark", Web'e Dair → "Vebe Dair", Fentra'yla → "Fentrayla". "Hosting" ve "spam" okunduğu gibi kaldı. Metinde şapkalı harf yok.

## Ses ayarları

Bölüm 2 ile aynı ses ve ayarlar (Fatih Yıldırım, speed 1.05, stability %43, similarity %75), dil: Turkish.

## Teslim

Metnin tamamını tek seferde üretin; dosyayı buraya ekleyin ya da `fentra-webe-dair/assets/vo/bolum-03.mp3` olarak yükleyin.

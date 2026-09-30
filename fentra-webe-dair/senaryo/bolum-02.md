# WEB'E DAİR · Bölüm 2 — Kapınızdaki Kilit

Konu: HTTP, HTTPS, SSL sertifikası · Format: 9:16, 1080×1920, 30 fps · Tahmini süre: ~95–100 sn · Ses: Bölüm 1 ile aynı (Fatih Yıldırım, ElevenLabs)

Hedef: Hiç bilmeyen biri, "Güvenli değil" uyarısının ne demek olduğunu ve sitesinde neyi kontrol etmesi gerektiğini anlamalı. Bölüm 1'deki şehir aynen devam eder; bu bölüm şehre **kapıdaki kilidi** ekler.

Benzetmeler: HTTP = açık kartpostal · HTTPS = kilitli kutu · SSL sertifikası = sitenin kimlik kartı

Bölüm çubuğu: 01 HTTP · 02 HTTPS · 03 SERTİFİKA

## Sahneler

| # | Anlatım (altyazı metni) | Şehir (benzetme) | Gerçekte (köşe kartı) | Terim kartı |
|---|---|---|---|---|
| 01 | Bir siteye girdiniz. Adres çubuğunda kırmızı bir uyarı var: "Güvenli değil." Bu siteye kart bilgilerinizi girer miydiniz? | — | Ekranın ortasında telefon: adres çubuğunda kırmızı "⚠ Güvenli değil", sayfada ödeme formu ("Kart numarası"). Parmak alanın üstünde durur, uyarı nabız gibi atar. | — |
| 02 | Web'e Dair. İkinci bölüm: kapınızdaki kilit. | Başlık ışık çizgilerinden kurulur, altında kilit simgesi çizilir. | — | — |
| 03 | Geçen bölümde sitenizin adresini, binasını ve yolunu kurduk. Bugün kapıya kilit takıyoruz. | Kamera Bölüm 1'in şehrinin üstünden geçer: tabela, bina, mavi rota sırayla yanar. Binanın kapısına iner; kapı kilitsiz ve aralık. | — | — |
| 04 | Bir siteye girdiğinizde, telefonunuzla sunucu arasında sürekli bilgi taşınır. Hatetepe ile bu bilgiler yolda açık bir kartpostal gibi gider. Örneğin kafedeki ortak Wi-Fi'da, yazdığınız şifreyi başkası okuyabilir. | Rotada beyaz kartpostallar akar, üzerlerinde yazılar okunur ("Şifre: 1234"). Yolun kenarında Wi-Fi simgeli bir kafe; bir büyüteç kartpostalı okur. | Adres çubuğu "http://websiteniz.com" ve "Güvenli değil"; giriş formu, altında "ağda görünen" satır: şifre=1234. | HTTP · Bilginin şifrelenmeden, açıkça taşındığı eski yöntem. |
| 05 | Hatetepees ise aynı bilgiyi kilitli bir kutuya koyar. Sondaki es harfi güvenli anlamına gelir. Kutunun anahtarı sadece tarayıcınızda ve sitenin sunucusunda vardır. Yolda biri kutuyu ele geçirse bile, anlamsız karakterlerden başka bir şey göremez. | Kartpostallar mavi ışıklı, kilitli küplere dönüşür. Telefonda ve binada birbirinin eşi iki anahtar yanar. Büyüteç artık yalnızca "x9#fK2@…" görür. | Adres çubuğu "https://" + kilit; aynı satır artık 8f3a…e21c. | HTTPS · Bilginin şifrelenerek taşındığı güvenli yöntem. S = Secure (güvenli). |
| 06 | Peki tarayıcı sitenin gerçekten o site olduğunu nereden bilir? İşte burada SSL sertifikası devreye girer. Bu sertifika sitenizin kimlik kartıdır ve güvenilir bir kurum tarafından verilir. Tarayıcı göz açıp kapayıncaya kadar kontrol eder: Geçerli mi, bu adrese mi ait, süresi dolmuş mu? Her şey yolundaysa, kapıya kilit takılır. | Mühürlü bir belge binanın kapısına uçar. Üç onay yanar, ardından 3D asma kilit kapıya "klik" diye takılır ve kapı maviyle parlar. | Sertifika kartı: Verilen: websiteniz.com · Veren: Güvenilir sertifika kurumu · Geçerlilik tarihi. Sorularla eş zamanlı üç ✓. | SSL SERTİFİKASI · Sitenin kimliğini doğrulayan dijital belge. (Bugünkü teknik adı TLS.) |
| 07 | Sertifika yoksa, tarayıcı ziyaretçinizi uyarır: "Güvenli değil." Çoğu müşteri o anda geri döner. Google da güvenli siteleri önemser. | Kilit kaybolur, kapıda kırmızı uyarı. Gelen ziyaretçi ışıkları kapıya kadar gelip geri döner. | Kırmızı "Güvenli değil" sayfası; ardından arama sonuçları, kilitli site yukarı çıkar. | — |
| 08 | İyi haber şu: Birçok hosting firması sertifikayı ücretsiz verir ve kendiliğinden yeniler. Adres çubuğunda "Güvenli değil" uyarısı görmüyorsanız, kapınız kilitli demektir. | Kilit geri takılır, çevresinde dönen bir yenileme halkası. | Hosting paneli: SSL: Açık ✓ · Otomatik yenileme: Açık ✓; sonra temiz adres çubuğu. | — |
| 09 | Kısacası: Hatetepe açık bir kartpostal, hatetepees kilitli bir kutu. SSL sertifikası ise sitenizin kimlik kartı. | Kamera geri çekilir: kartpostal, kilitli kutu ve kimlik kartı sırayla şehrin üstünde belirir. | — | — |
| 10 | Bu kartı kaydedin! Sıradaki bölümde: kapınızdaki posta kutusu, yani kurumsal e-posta. Web'e Dair, Fentra'yla. | Sözlük kartı, kaydet; sıradaki bölüm için çizilen posta kutusu; Fentra logosu ve ses logosu. | — | — |

**Sözlük kartı:** HTTP = Açık kartpostal · HTTPS = Kilitli kutu · SSL sertifikası = Sitenizin kimlik kartı

## ElevenLabs metni

Her paragraf bir sahnedir; paragraflar arasındaki boş satır sahne geçişidir. Nokta tam durak ve es, virgül kısa nefes, iki nokta kısa bir bekleyiş verir. Metinde üç nokta yok.

```text
Bir siteye girdiniz. Adres çubuğunda kırmızı bir uyarı var: "Güvenli değil." Bu siteye kart bilgilerinizi girer miydiniz?

Vebe Dair. İkinci bölüm: kapınızdaki kilit.

Geçen bölümde sitenizin adresini, binasını ve yolunu kurduk. Bugün kapıya kilit takıyoruz.

Bir siteye girdiğinizde, telefonunuzla sunucu arasında sürekli bilgi taşınır. Hatetepe ile bu bilgiler yolda açık bir kartpostal gibi gider. Örneğin kafedeki ortak vayfayda, yazdığınız şifreyi başkası okuyabilir.

Hatetepees ise aynı bilgiyi kilitli bir kutuya koyar. Sondaki es harfi güvenli anlamına gelir. Kutunun anahtarı sadece tarayıcınızda ve sitenin sunucusunda vardır. Yolda biri kutuyu ele geçirse bile, anlamsız karakterlerden başka bir şey göremez.

Peki tarayıcı sitenin gerçekten o site olduğunu nereden bilir? İşte burada es es el sertifikası devreye girer. Bu sertifika sitenizin kimlik kartıdır ve güvenilir bir kurum tarafından verilir. Tarayıcı göz açıp kapayıncaya kadar kontrol eder: Geçerli mi, bu adrese mi ait, süresi dolmuş mu? Her şey yolundaysa, kapıya kilit takılır.

Sertifika yoksa, tarayıcı ziyaretçinizi uyarır: "Güvenli değil." Çoğu müşteri o anda geri döner. Gogıl da güvenli siteleri önemser.

İyi haber şu: Birçok hosting firması sertifikayı ücretsiz verir ve kendiliğinden yeniler. Adres çubuğunda "Güvenli değil" uyarısı görmüyorsanız, kapınız kilitli demektir.

Kısacası: Hatetepe açık bir kartpostal, hatetepees kilitli bir kutu. Es es el sertifikası ise sitenizin kimlik kartı.

Bu kartı kaydedin! Sıradaki bölümde: kapınızdaki posta kutusu, yani kurumsal e-posta. Vebe Dair, Fentrayla.
```

Okunuş: HTTP → "hatetepe", HTTPS → "hatetepees", SSL → "es es el", Wi-Fi → "vayfay", Google → "Gogıl", Web'e Dair → "Vebe Dair", Fentra'yla → "Fentrayla". "Hosting" Bölüm 1'deki gibi olduğu gibi kaldı. Metinde şapkalı harf yok.

## Ses ayarları

Bölüm 1 ile aynı ses ve ayarlar (dosya adından: Fatih Yıldırım, Multilingual v2, speed 1.17, stability %50, similarity %75, style %25, speaker boost açık), dil: Turkish. İki bölüm arka arkaya izlendiğinde ses aynı kalsın.

## Teslim

Metnin tamamını tek seferde üretin; dosyayı `fentra-webe-dair/assets/vo/bolum-02.mp3` olarak yükleyin ya da buraya ekleyin. Beğenmediğiniz bir paragraf olursa yalnızca onu ayrıca üretip `sahne-05.mp3` gibi adlandırın.

"""Episode 2 voice-over as recorded (phonetic spelling) and as captioned (correct spelling).
Each scene is a list of sentences; each sentence is (spoken, caption)."""

SCENES = [
    ("hook", [
        ("Bir siteye girdiniz.", "Bir siteye girdiniz."),
        ("Adres çubuğunda kırmızı bir uyarı var: \"Güvenli değil.\"", "Adres çubuğunda kırmızı bir uyarı var: \"Güvenli değil.\""),
        ("Bu siteye kart bilgilerinizi girer miydiniz?", "Bu siteye kart bilgilerinizi girer miydiniz?"),
    ]),
    ("title", [
        ("Vebe Dair.", "Web'e Dair."),
        ("İkinci bölüm: kapınızdaki kilit.", "İkinci bölüm: kapınızdaki kilit."),
    ]),
    ("bridge", [
        ("Geçen bölümde sitenizin adresini, binasını ve yolunu kurduk.", "Geçen bölümde sitenizin adresini, binasını ve yolunu kurduk."),
        ("Bugün kapıya kilit takıyoruz.", "Bugün kapıya kilit takıyoruz."),
    ]),
    ("http", [
        ("Bir siteye girdiğinizde, telefonunuzla sunucu arasında sürekli bilgi taşınır.",
         "Bir siteye girdiğinizde, telefonunuzla sunucu arasında sürekli bilgi taşınır."),
        ("Hatetepe ile bu bilgiler yolda açık bir kartpostal gibi gider.", "HTTP ile bu bilgiler yolda açık bir kartpostal gibi gider."),
        ("Örneğin kafedeki ortak vayfayda, yazdığınız şifreyi başkası okuyabilir.",
         "Örneğin kafedeki ortak Wi-Fi'da, yazdığınız şifreyi başkası okuyabilir."),
    ]),
    ("https", [
        ("Hatetepees ise aynı bilgiyi kilitli bir kutuya koyar.", "HTTPS ise aynı bilgiyi kilitli bir kutuya koyar."),
        ("Sondaki es harfi güvenli anlamına gelir.", "Sondaki S harfi güvenli anlamına gelir."),
        ("Kutunun anahtarı sadece tarayıcınızda ve sitenin sunucusunda vardır.",
         "Kutunun anahtarı sadece tarayıcınızda ve sitenin sunucusunda vardır."),
        ("Yolda biri kutuyu ele geçirse bile, anlamsız karakterlerden başka bir şey göremez.",
         "Yolda biri kutuyu ele geçirse bile, anlamsız karakterlerden başka bir şey göremez."),
    ]),
    ("cert", [
        ("Peki tarayıcı sitenin gerçekten o site olduğunu nereden bilir?", "Peki tarayıcı sitenin gerçekten o site olduğunu nereden bilir?"),
        ("İşte burada es es el sertifikası devreye girer.", "İşte burada SSL sertifikası devreye girer."),
        ("Bu sertifika sitenizin kimlik kartıdır ve güvenilir bir kurum tarafından verilir.",
         "Bu sertifika sitenizin kimlik kartıdır ve güvenilir bir kurum tarafından verilir."),
        ("Tarayıcı göz açıp kapayıncaya kadar kontrol eder: Geçerli mi, bu adrese mi ait, süresi dolmuş mu?",
         "Tarayıcı göz açıp kapayıncaya kadar kontrol eder: Geçerli mi, bu adrese mi ait, süresi dolmuş mu?"),
        ("Her şey yolundaysa, kapıya kilit takılır.", "Her şey yolundaysa, kapıya kilit takılır."),
    ]),
    ("without", [
        ("Sertifika yoksa, tarayıcı ziyaretçinizi uyarır: \"Güvenli değil.\"", "Sertifika yoksa, tarayıcı ziyaretçinizi uyarır: \"Güvenli değil.\""),
        ("Çoğu müşteri o anda geri döner.", "Çoğu müşteri o anda geri döner."),
        ("Gogıl da güvenli siteleri önemser.", "Google da güvenli siteleri önemser."),
    ]),
    ("tip", [
        ("İyi haber şu: Birçok hosting firması sertifikayı ücretsiz verir ve kendiliğinden yeniler.",
         "İyi haber şu: Birçok hosting firması sertifikayı ücretsiz verir ve kendiliğinden yeniler."),
        ("Adres çubuğunda \"Güvenli değil\" uyarısı görmüyorsanız, kapınız kilitli demektir.",
         "Adres çubuğunda \"Güvenli değil\" uyarısı görmüyorsanız, kapınız kilitli demektir."),
    ]),
    ("recap", [
        ("Kısacası: Hatetepe açık bir kartpostal, hatetepees kilitli bir kutu.", "Kısacası: HTTP açık bir kartpostal, HTTPS kilitli bir kutu."),
        ("Es es el sertifikası ise sitenizin kimlik kartı.", "SSL sertifikası ise sitenizin kimlik kartı."),
    ]),
    ("outro", [
        ("Bu kartı kaydedin!", "Bu kartı kaydedin!"),
        ("Sıradaki bölümde: kapınızdaki posta kutusu, yani kurumsal e-posta.", "Sıradaki bölümde: kapınızdaki posta kutusu, yani kurumsal e-posta."),
        ("Vebe Dair, Fentrayla.", "Web'e Dair, Fentra'yla."),
    ]),
]

"""Episode 1 voice-over, exactly as recorded (phonetic spelling) and as it is captioned (correct spelling).
Each scene is a list of sentences; each sentence is (spoken, caption)."""

SCENES = [
    ("hook", [
        ("Gogıla yazarsınız.", "Google'a yazarsınız."),
        ("bir siteye dokunursunuz ve sayfa açılır.", "Bir siteye dokunursunuz ve sayfa açılır."),
        ("Bir saniye bile sürmez.", "Bir saniye bile sürmez."),
        ("Ama o bir saniyede, perde arkasında üç şey çalışır.", "Ama o bir saniyede, perde arkasında üç şey çalışır."),
    ]),
    ("title", [
        ("Vebe Dair.", "Web'e Dair."),
        ("Birinci bölüm: adres, bina ve yol.", "Birinci bölüm: adres, bina ve yol."),
    ]),
    ("domain", [
        ("Birincisi: domeyn, yani alan adı.", "Birincisi: domain, yani alan adı."),
        ("Gogıl sonuçlarında gördüğünüz, adres çubuğuna yazdığınız o isim: vebsiteniz nokta kom.",
         "Google sonuçlarında gördüğünüz, adres çubuğuna yazdığınız o isim: websiteniz.com"),
        ("Dükkanınızın açık adresi neyse, sitenizin domeyni de odur.", "Dükkanınızın açık adresi neyse, sitenizin domain'i de odur."),
    ]),
    ("hosting", [
        ("İkincisi: hosting.", "İkincisi: hosting."),
        ("Sitenizdeki yazılar, fotoğraflar, menünüz...", "Sitenizdeki yazılar, fotoğraflar, menünüz..."),
        ("Hepsi gece gündüz açık kalan özel bilgisayarlarda saklanır.", "Hepsi gece gündüz açık kalan özel bilgisayarlarda saklanır."),
        ("Bunlara sunucu denir.", "Bunlara sunucu denir."),
        ("Hosting ise bu sunucularda sitenize kiraladığınız alandır.", "Hosting ise bu sunucularda sitenize kiraladığınız alandır."),
        ("Yani adresinizdeki bina.", "Yani adresinizdeki bina."),
    ]),
    ("ip", [
        ("Peki tarayıcı doğru binayı nasıl buluyor?", "Peki tarayıcı doğru binayı nasıl buluyor?"),
        ("Burada bir sorun var.", "Burada bir sorun var."),
        ("Bilgisayarlar isimleri değil, numaraları tanır.", "Bilgisayarlar isimleri değil, numaraları tanır."),
        ("Her sunucunun bir numarası vardır: aypi adresi.", "Her sunucunun bir numarası vardır: IP adresi."),
    ]),
    ("dns", [
        ("İşte üçüncüsü: dienes.", "İşte üçüncüsü: DNS."),
        ("Telefon rehberinizi düşünün.", "Telefon rehberinizi düşünün."),
        ("Bir isme dokunursunuz, numarayı ezberlemenize gerek kalmaz, telefon onu kendisi bulur.",
         "Bir isme dokunursunuz, numarayı ezberlemenize gerek kalmaz, telefon onu kendisi bulur."),
        ("Dienes de yazdığınız ismi numaraya çevirir ve sizi doğru binaya götürür.",
         "DNS de yazdığınız ismi numaraya çevirir ve sizi doğru binaya götürür."),
    ]),
    ("move", [
        ("Hostinginizi değiştirseniz bile adresiniz aynı kalır.", "Hosting'inizi değiştirseniz bile adresiniz aynı kalır."),
        ("Sadece rehberdeki numara güncellenir.", "Sadece rehberdeki numara güncellenir."),
        ("Bunun her yere ulaşması birkaç saat sürebilir.", "Bunun her yere ulaşması birkaç saat sürebilir."),
    ]),
    ("recap", [
        ("Şimdi obir saniyeye tekrar bakalım.", "Şimdi o bir saniyeye tekrar bakalım."),
        ("Adresi yazarsınız, dienes yolu bulur, hosting sayfayı açar.", "Adresi yazarsınız, DNS yolu bulur, hosting sayfayı açar."),
    ]),
    ("outro", [
        ("İşte bu kadar basit.", "İşte bu kadar basit."),
        ("Domeyn adresiniz, hosting binanız ve dienes ise yol tarifiniz.", "Domain adresiniz, hosting binanız ve DNS ise yol tarifiniz."),
        ("Bu kartı kaydedin!", "Bu kartı kaydedin!"),
        ("Sıradaki bölümde: kapınızdaki kilit.", "Sıradaki bölümde: kapınızdaki kilit."),
        ("Vebe Dair, Fentrayla.", "Web'e Dair, Fentra'yla."),
    ]),
]

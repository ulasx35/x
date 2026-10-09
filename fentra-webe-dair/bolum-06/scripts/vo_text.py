"""Episode 6 voice-over as recorded (phonetic spelling) and as captioned (correct spelling).
Each scene is a list of sentences; each sentence is (spoken, caption)."""

S = lambda x: (x, x)
SCENES = [
    ("hook", [
        S("Biri telefonuna, yakınımdaki kuaför yazdı."),
        S("Haritada üç işletme çıktı, yıldızlarıyla ve yol tarifiyle."),
        S("Sizin işletmeniz o haritada var mı?"),
    ]),
    ("title", [
        ("Vebe Dair.", "Web'e Dair."),
        S("Altıncı bölüm: haritadaki yeriniz."),
    ]),
    ("bridge", [
        S("Siteniz hazır, hızlı ve güvende."),
        S("Ama müşteri sizi önce haritada arıyor."),
    ]),
    ("card", [
        ("Gogıl İşletme Profili, işletmenizin Gogıldaki ücretsiz kartıdır.", "Google İşletme Profili, işletmenizin Google'daki ücretsiz kartıdır."),
        S("Aramada ve haritada çıkar: adresiniz, çalışma saatleriniz, telefonunuz, fotoğraflarınız ve yorumlarınız, hepsi tek bir kartta."),
    ]),
    ("why", [
        S("Yakınında bir işletme arayan kişi, çoğu zaman sitenize girmeden karar verir."),
        S("Kartı olmayan işletme, haritada görünmez."),
        S("Müşteri de iğnesi olan yan dükkana gider."),
    ]),
    ("setup", [
        S("Kurmak ücretsizdir."),
        S("İşletmenizi ekler ve sahibi olduğunuzu doğrularsınız."),
        S("Sonra her bilgiyi eksiksiz doldurun: adres, saat, telefon ve sitenizin adresi."),
        S("Bu bilgiler, sitenizde ve her yerde aynı olmalı."),
    ]),
    ("reviews", [
        S("Yorumlar, vitrininizin en güçlü parçasıdır."),
        S("Memnun müşterilerinizden yorum isteyin ve her yoruma cevap verin, olumsuz olanlara da."),
        S("Cevap veren işletme, güven veren işletmedir."),
    ]),
    ("hours", [
        S("Bayramda saatleriniz mi değişti?"),
        S("Kartınızı da güncelleyin."),
        S("Yanlış saat yüzünden kapıda kalan müşteri, bir daha gelmez."),
    ]),
    ("recap", [
        S("Kısacası: İşletme profili, haritadaki iğneniz."),
        S("Ve bu sezonun sonunda, şehirdeki yeriniz tamam."),
    ]),
    ("outro", [
        S("Bu kartı kaydedin!"),
        ("Sıradaki sezonda: Gogılda üst sıralara çıkmak, yani es i o.", "Sıradaki sezonda: Google'da üst sıralara çıkmak, yani SEO."),
        ("Vebe Dair, Fentrayla.", "Web'e Dair, Fentra'yla."),
    ]),
]

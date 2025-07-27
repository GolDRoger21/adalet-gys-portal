/**
 * @file Ortak HTML şablonlarını sayfalara dinamik olarak yükler.
 * @description Bu script, header, footer ve modallar gibi ortak bileşenleri
 * bir şablon dosyasından alıp ilgili sayfanın DOM'una enjekte eder.
 * Bu sayede kod tekrarı önlenir ve bakım kolaylaşır.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Sadece sınav sayfalarında değil, ortak yapıya ihtiyaç duyan tüm sayfalarda çalışabilir.
    // Şimdilik sınav sayfalarını hedefliyoruz.
    if (document.getElementById('app-container')) {
        loadExamTemplate();
    }
});

async function loadExamTemplate() {
    try {
        const response = await fetch('/adalet-gys-portal/_templates/sinav-sablonu.html');
        if (!response.ok) {
            throw new Error(`Şablon dosyası yüklenemedi: ${response.statusText}`);
        }
        const templateText = await response.text();

        // Şablon metnini geçici bir container'a yükle
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        // Şablondan elementleri seç
        const header = tempContainer.querySelector('.navbar');
        const resultModal = tempContainer.querySelector('#result-modal');
        const alertModal = tempContainer.querySelector('#alert-modal');
        const footer = tempContainer.querySelector('.footer');
        
        // Sayfadaki ana elementleri seç
        const body = document.body;
        const mainContent = document.querySelector('main');

        // Elementleri sayfaya enjekte et
        if (header) body.prepend(header); // Header'ı body'nin en başına
        if (resultModal && mainContent) mainContent.after(resultModal); // Modalları <main> etiketinden sonra
        if (alertModal && resultModal) resultModal.after(alertModal);
        if (footer) body.appendChild(footer); // Footer'ı body'nin en sonuna

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        // Hata durumunda kullanıcıya bilgi ver
        document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">Sayfa yüklenirken kritik bir hata oluştu.</h1>';
    }
}

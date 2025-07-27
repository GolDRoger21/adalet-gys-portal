/**
 * @file Ortak HTML şablonlarını sayfalara dinamik olarak yükler.
 * @description Bu script, header, footer ve modallar gibi ortak bileşenleri
 * bir şablon dosyasından alıp ilgili sayfanın DOM'una enjekte eder.
 * İşlem tamamlandığında 'template-loaded' event'ini tetikler.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Şablon gerektiren sayfalarda yükleyiciyi çalıştır.
    if (document.body.dataset.needsTemplate) {
        loadCommonTemplate();
    }
});

async function loadCommonTemplate() {
    try {
        // Not: Bu yol, projenin kök dizinine göre ayarlanmalıdır. GitHub Pages için bu yol doğrudur.
        const response = await fetch('/adalet-gys-portal/_templates/sinav-sablonu.html');
        if (!response.ok) {
            throw new Error(`Şablon dosyası yüklenemedi: ${response.statusText}`);
        }
        const templateText = await response.text();

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        const header = tempContainer.querySelector('.navbar');
        const resultModal = tempContainer.querySelector('#result-modal');
        const alertModal = tempContainer.querySelector('#alert-modal');
        const footer = tempContainer.querySelector('.footer');
        
        const body = document.body;
        
        if (header) body.prepend(header);
        if (footer) body.appendChild(footer); // Footer en sona
        if (alertModal) body.appendChild(alertModal); // Modallar da en sona
        if (resultModal) body.appendChild(resultModal);

        // --- EN ÖNEMLİ DEĞİŞİKLİK BURADA ---
        // Her şeyin yüklendiğini diğer script'lere haber ver.
        document.dispatchEvent(new Event('template-loaded'));

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">Sayfa yüklenirken kritik bir hata oluştu.</h1>';
    }
}

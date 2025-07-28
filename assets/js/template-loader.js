/**
 * @file Adalet GYS Portalı için ortak şablon yükleyici.
 * @description Header, footer ve modallar gibi ortak HTML bileşenlerini ilgili sayfalara dinamik olarak yükler.
 * @version 6.0 (Robust Container-Based Loading)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Bu script, body etiketinde 'data-needs-template' olan sayfalarda çalışır.
    if (document.body.dataset.needsTemplate) {
        loadCommonTemplate();
    }
});

/**
 * Şablonu sunucudan çeker ve içeriğini sayfanın ihtiyacına göre ('page' veya 'exam')
 * doğru bileşenleri sayfaya ekler. İşi bitince 'template-loaded' sinyali gönderir.
 */
async function loadCommonTemplate() {
    try {
        const response = await fetch('/adalet-gys-portal/_templates/sinav-sablonu.html');
        if (!response.ok) {
            throw new Error(`Şablon dosyası yüklenemedi.`);
        }
        const templateText = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        const header = tempContainer.querySelector('.navbar');
        const footer = tempContainer.querySelector('.footer');
        const body = document.body;

        // Her sayfaya başlık (en üste) ve alt bilgiyi (en alta) ekle
        if (header) body.prepend(header);
        if (footer) body.appendChild(footer);

        // SADECE sınav sayfalarına (data-needs-template="exam") özel pencereleri ekle
        if (body.dataset.needsTemplate === 'exam') {
            const resultModal = tempContainer.querySelector('#result-modal');
            const alertModal = tempContainer.querySelector('#alert-modal');
            
            if (resultModal) document.body.appendChild(resultModal);
            if (alertModal) document.body.appendChild(alertModal);
        }

        // Her şeyin bittiğini ve diğer script'lerin başlayabileceğini bildiren sinyali gönder.
        document.dispatchEvent(new Event('template-loaded'));

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        // Hata durumunda kullanıcıya bilgi ver
        const mainContent = document.querySelector('main') || document.body;
        mainContent.innerHTML = '<div class="card p-8 text-center"><h1 class="text-xl font-bold text-red-600">Tema yüklenirken bir hata oluştu.</h1></div>';
    }
}

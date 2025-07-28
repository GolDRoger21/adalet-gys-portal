/**
 * @file Adalet GYS Portalı için ortak şablon yükleyici.
 * @description Header, footer ve modallar gibi ortak HTML bileşenlerini ilgili sayfalara dinamik olarak yükler.
 * @version 6.4 (Final Exam Template Loader)
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
            throw new Error(`Şablon dosyası yüklenemedi. Status: ${response.status}`);
        }
        const templateText = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        const header = tempContainer.querySelector('.navbar');
        const footer = tempContainer.querySelector('.footer');
        const body = document.body;

        // Her sayfaya başlık (en üste) ve alt bilgiyi (en alta) ekle
        if (header) body.prepend(header.cloneNode(true));
        if (footer) body.appendChild(footer.cloneNode(true));

        // SADECE sınav sayfalarına (data-needs-template="exam") özel elementleri ekle
        if (body.dataset.needsTemplate === 'exam') {
            // Alert modal'ı body'e ekle (ModalManager.show için gerekli)
            const alertModal = tempContainer.querySelector('#alert-modal');
            if (alertModal) {
                document.body.appendChild(alertModal.cloneNode(true));
            }

            // sinav-sablonu.html içindeki #app-container elementini ve içeriğini al
            const templateAppContainer = tempContainer.querySelector('#app-container');
            
            // templateAppContainer'in TÜMÜNÜ (sınıflar+id+içerik) gerçek app-container ile değiştir.
            const targetAppContainer = document.getElementById('app-container');
            if (templateAppContainer && targetAppContainer) {
                // 1. Yeni bir element oluştur
                const newAppContainer = document.createElement('main');
                // 2. ID'sini aktar
                newAppContainer.id = templateAppContainer.id;
                // 3. Sınıflarını aktar
                newAppContainer.className = templateAppContainer.className;
                // 4. İçeriğini aktar
                newAppContainer.innerHTML = templateAppContainer.innerHTML;
                // 5. Eski elementi yeni elementle değiştir
                targetAppContainer.parentNode.replaceChild(newAppContainer, targetAppContainer);
            } else if (!targetAppContainer) {
                console.error('Hedef app-container elementi (deneme-1.html\'deki) bulunamadı.');
            } else if (!templateAppContainer) {
                console.error('Şablon içindeki app-container elementi (sinav-sablonu.html\'deki) bulunamadı.');
            }
        }

        // Her şeyin bittiğini ve diğer script'lerin başlayabileceğini bildiren sinyali gönder.
        document.dispatchEvent(new Event('template-loaded'));

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        // Hata durumunda kullanıcıya bilgi ver
        const mainContent = document.querySelector('main') || document.body;
        mainContent.innerHTML = '<div class="card p-8 text-center"><h1 class="text-xl font-bold text-red-600">Tema yüklenirken bir hata oluştu.</h1><p class="mt-2">' + error.message + '</p></div>';
    }
}

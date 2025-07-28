document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.needsTemplate) {
        loadCommonTemplate();
    }
});

async function loadCommonTemplate() {
    try {
        const response = await fetch('/adalet-gys-portal/_templates/sinav-sablonu.html');
        if (!response.ok) throw new Error('Şablon dosyası yüklenemedi.');
        const templateText = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;

        const header = tempContainer.querySelector('.navbar');
        const footer = tempContainer.querySelector('.footer');
        const body = document.body;

        if (header) body.prepend(header);
        if (footer) body.appendChild(footer);

        if (body.dataset.needsTemplate === 'exam') {
            const resultModal = tempContainer.querySelector('#result-modal');
            const alertModal = tempContainer.querySelector('#alert-modal');
            if (alertModal) body.appendChild(alertModal);
            if (resultModal) body.appendChild(resultModal);
        }
        document.dispatchEvent(new Event('template-loaded'));
    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        document.body.innerHTML = '<h1>Sayfa şablonu yüklenirken bir hata oluştu.</h1>';
    }
}

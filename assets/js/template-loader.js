document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.needsTemplate) {
        loadCommonTemplate();
    }
});

async function loadCommonTemplate() {
    try {
        // BU DOSYANIN KENDİSİNE GÖRE YOL: ../../_templates/...
        const response = await fetch('../../../_templates/sinav-sablonu.html'); 
        if (!response.ok) {
            throw new Error(`Şablon dosyası yüklenemedi: ${response.statusText}`);
        }
        const templateText = await response.text();

        // ... Geri kalan kod aynı...
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateText;
        const header = tempContainer.querySelector('.navbar');
        const resultModal = tempContainer.querySelector('#result-modal');
        const alertModal = tempContainer.querySelector('#alert-modal');
        const footer = tempContainer.querySelector('.footer');
        const body = document.body;
        if (header) body.prepend(header);
        if (footer) body.appendChild(footer);
        if (alertModal) body.appendChild(alertModal);
        if (resultModal) body.appendChild(resultModal);

        document.dispatchEvent(new Event('template-loaded'));

    } catch (error) {
        console.error('Şablon yükleme hatası:', error);
        document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">Sayfa yüklenirken kritik bir hata oluştu.</h1>';
    }
}
